"use server";
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import queueService from "@/domains/queue/queue.service";
import participantService from "@/domains/queue/participant.service";
import { authApi } from "@/lib/api";
import { Queue, QueueInput, UserQueue, Participant } from "@/types";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const IDEMPOTENCY_WINDOW = 300_000; // 5-min window, matches backend cacheTTL.IDEMPOTENCY

const getAuthToken = async (): Promise<string | undefined> => {
  const cookieStore = await cookies();
  return cookieStore.get("digital_queue_jwt")?.value;
};

const decodeJwtUserId = (token: string): string | undefined => {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    ) as { id?: string };
    return decoded.id;
  } catch {
    return undefined;
  }
};

// ─── Queue CRUD ────────────────────────────────────────────────────────────

export const createQueue = async (commerceId: string, formData: FormData) => {
  const data: QueueInput & { commerce_id: string } = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    type: formData.get("type") as "ephemera" | "permanent",
    status: formData.get("status") as "open" | "closed",
    commerce_id: commerceId,
  };

  const queue = await queueService().register(data);
  revalidatePath(`/comercio/${commerceId}`);
  return queue;
};

export const getQueue = async (
  commerceId: string,
  queueId: string
): Promise<Queue> => {
  const response = await authApi(`/queue/${commerceId}/${queueId}`);
  return (await response.json()) as Queue;
};

export const updateQueue = async (
  commerceId: string,
  queueId: string,
  formData: FormData
) => {
  const data: Partial<QueueInput> = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    type: formData.get("type") as "ephemera" | "permanent",
    status: formData.get("status") as "open" | "closed",
  };

  await queueService().update(commerceId, queueId, data);
  redirect(`/comercio/${commerceId}`);
};

// ─── Participants ───────────────────────────────────────────────────────────

export const getParticipants = async (
  commerceId: string
): Promise<Participant[]> => {
  try {
    return await participantService().list(commerceId);
  } catch {
    return [];
  }
};

export const callNextParticipant = async (commerceId: string) => {
  await participantService().removeNext(commerceId);
  revalidatePath(`/comercio/${commerceId}`);
};

// ─── User queues ────────────────────────────────────────────────────────────

export const getUserQueues = async (): Promise<UserQueue[]> => {
  try {
    const response = await authApi("/user/queues");
    const json = (await response.json()) as {
      data?: { userQueues?: UserQueue[] };
    };
    return json.data?.userQueues ?? [];
  } catch {
    return [];
  }
};

export const exitQueue = async (commerceId: string) => {
  await participantService().exit(commerceId);
  revalidatePath("/minhas-filas");
};

// ─── Queue entry (customer flow) ───────────────────────────────────────────

export const enterDirect = async (
  commerceId: string,
  queueId: string,
  anonymousId: string
): Promise<{ position?: number; error?: string }> => {
  try {
    const accessToken = await getAuthToken();
    const userId = accessToken ? decodeJwtUserId(accessToken) : undefined;

    const participantId = userId ?? anonymousId;
    const idempotencySecret = accessToken ?? anonymousId;
    const timeBucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW);
    const idempotencyKey = createHmac("sha256", idempotencySecret)
      .update(`${queueId}:${participantId}:${timeBucket}`)
      .digest("hex");

    const res = await authApi(`/participants-queue/enter/${commerceId}`, {
      method: "POST",
      headers: {
        "X-Anonymous-Id": anonymousId,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({}),
    });
    const json = (await res.json()) as {
      data?: { position?: number };
      message?: string;
    };
    if (!res.ok) return { error: json.message ?? "Erro ao entrar na fila" };
    return { position: json.data?.position };
  } catch {
    return { error: "Não foi possível entrar na fila. Tente novamente." };
  }
};

export const enterViaToken = async (
  queueId: string,
  token: string,
  anonymousId: string
): Promise<{ position?: number; error?: string }> => {
  try {
    const accessToken = await getAuthToken();
    const userId = accessToken ? decodeJwtUserId(accessToken) : undefined;

    // POST /enter-queue ignores JWT — must send userId or anonymousId explicitly
    const participantId = userId ?? anonymousId;
    const timeBucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW);
    const idempotencyKey = createHmac("sha256", token)
      .update(`${queueId}:${participantId}:${timeBucket}`)
      .digest("hex");

    const body = userId
      ? { queueId, qrcodeToken: token, userId }
      : { queueId, qrcodeToken: token, anonymousId };

    const res = await authApi("/enter-queue", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) return { error: json.message ?? "Erro ao entrar na fila" };
    return {};
  } catch {
    return { error: "Não foi possível entrar na fila. Tente novamente." };
  }
};

export const exitQueueAnon = async (
  commerceId: string,
  anonymousId: string
): Promise<{ error?: string }> => {
  try {
    const res = await authApi(`/participants-queue/${commerceId}/exit`, {
      method: "DELETE",
      headers: { "X-Anonymous-Id": anonymousId },
    });
    if (!res.ok) {
      const json = (await res.json()) as { message?: string };
      return { error: json.message ?? "Erro ao sair da fila" };
    }
    return {};
  } catch {
    return { error: "Não foi possível sair da fila." };
  }
};
