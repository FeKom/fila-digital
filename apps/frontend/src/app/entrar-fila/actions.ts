"use server";
import participantService from "@/services/participant";
import { Participant } from "@/types";
import { createHmac } from "crypto";

export const enterQueue = async (
  formData: FormData
): Promise<{ participant?: Participant; error?: string }> => {
  try {
    const queueId = formData.get("queueId") as string;
    const qrcodeToken = formData.get("qrcodeToken") as string;
    const userId = formData.get("userId") as string;
    const anonymousId = formData.get("anonymousId") as string;

    const participant_id = userId || anonymousId;
    const timeBucket = Math.floor(Date.now() / 300_000); // 5-min window matches backend TTL
    const idempotencyKey = createHmac("sha256", qrcodeToken)
      .update(`${queueId}:${participant_id}:${timeBucket}`)
      .digest("hex");

    const participant = await participantService().enter({
      queueId,
      qrcodeToken,
      userId: userId || undefined,
      anonymousId: anonymousId || undefined,
      idempotencyKey,
    });

    return { participant };
  } catch {
    return { error: "Não foi possível entrar na fila. Tente novamente." };
  }
};
