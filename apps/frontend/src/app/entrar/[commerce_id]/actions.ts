"use server";
import commerceService from "@/services/commerce";
import participantService from "@/services/participant";
import { Commerce } from "@/types";

export const getCommerce = async (
  commerceId: string
): Promise<Commerce | null> => {
  try {
    return await commerceService().getById(commerceId);
  } catch {
    return null;
  }
};

export const enterQueuePublic = async (
  commerceId: string,
  anonymousId: string
): Promise<{ ok: boolean; message?: string }> => {
  try {
    await participantService().enterPublic(commerceId, anonymousId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao entrar na fila",
    };
  }
};
