"use server";
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import queueService from "@/domains/queue/queue.service";
import participantService from "@/domains/queue/participant.service";
import { authApi } from "@/lib/api";
import {
  Queue,
  QueueInput,
  UserQueue,
  Participant,
  QueueSchedule,
} from "@/types";
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

export const createQueue = async (
  commerceId: string,
  formData: FormData
): Promise<Queue | null> => {
  const data: QueueInput & { commerce_id: string } = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    type: formData.get("type") as "ephemera" | "permanent",
    status: formData.get("status") as "open" | "closed",
    commerce_id: commerceId,
  };

  try {
    const queue = await queueService().register(data);
    revalidatePath(`/comercio/${commerceId}/dashboard`);
    return queue as Queue;
  } catch {
    return null;
  }
};

export const createQueueSchedule = async (
  commerceId: string,
  queueId: string,
  data: { type: "once" | "daily"; scheduled_at?: string }
): Promise<{ error?: string; data?: QueueSchedule }> => {
  const response = await authApi(`/queue/${commerceId}/${queueId}/schedule`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  const json = (await response.json()) as {
    data?: QueueSchedule;
    message?: string;
  };
  if (!response.ok)
    return { error: json.message ?? "Erro ao criar agendamento" };
  return { data: json.data };
};

export const getQueueSchedule = async (
  commerceId: string,
  queueId: string
): Promise<QueueSchedule | null> => {
  try {
    const response = await authApi(`/queue/${commerceId}/${queueId}/schedule`);
    const json = (await response.json()) as { data?: QueueSchedule | null };
    return json.data ?? null;
  } catch {
    return null;
  }
};

export const toggleQueueSchedule = async (
  commerceId: string,
  queueId: string,
  scheduleId: string,
  status: "active" | "inactive"
): Promise<{ error?: string }> => {
  const response = await authApi(
    `/queue/${commerceId}/${queueId}/schedule/${scheduleId}/toggle`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    return { error: json.message ?? "Erro ao atualizar agendamento" };
  }
  revalidatePath(`/comercio/${commerceId}/dashboard`);
  return {};
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
  const { redirect } = await import("next/navigation");
  const data: Partial<QueueInput> = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    type: formData.get("type") as "ephemera" | "permanent",
    status: formData.get("status") as "open" | "closed",
  };

  await queueService().update(commerceId, queueId, data);
  redirect(`/comercio/${commerceId}/dashboard`);
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

export const exitQueue = async (
  commerceId: string
): Promise<{ error?: string }> => {
  try {
    await participantService().exit(commerceId);
    revalidatePath("/minhas-filas");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erro ao sair da fila",
    };
  }
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
