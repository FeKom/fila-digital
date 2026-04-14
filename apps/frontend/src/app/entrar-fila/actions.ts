"use server";
import participantService from "@/services/participant";
import { Participant } from "@/types";

export const enterQueue = async (
  formData: FormData
): Promise<{ participant?: Participant; error?: string }> => {
  try {
    const queueId = formData.get("queueId") as string;
    const qrcodeToken = formData.get("qrcodeToken") as string;
    const userId = formData.get("userId") as string;
    const anonymousId = formData.get("anonymousId") as string;

    const participant = await participantService().enter({
      queueId,
      qrcodeToken,
      userId: userId || undefined,
      anonymousId: anonymousId || undefined,
    });

    return { participant };
  } catch {
    return { error: "Nao foi possivel entrar na fila. Tente novamente." };
  }
};
