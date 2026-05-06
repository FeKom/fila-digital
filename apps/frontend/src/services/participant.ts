import { authApi } from "@/lib/api";
import api from "@/lib/api";
import { Participant } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

const participantService = () => {
  return {
    list: async (commerceId: string) => {
      const response = await authApi(`/participants-queue/${commerceId}`);
      const json = (await response.json()) as {
        data?: { participants?: Participant[] };
      };
      return json.data?.participants ?? [];
    },
    enter: async (data: {
      queueId: string;
      qrcodeToken: string;
      userId?: string;
      anonymousId?: string;
      idempotencyKey: string;
    }) => {
      const body = {
        queueId: data.queueId,
        qrcodeToken: data.qrcodeToken,
        userId: data.userId,
        anonymousId: data.anonymousId,
      };
      const headers = new Headers({
        "Content-Type": "application/json",
        "Idempotency-Key": data.idempotencyKey,
      });
      const response = await api("/enter-queue", {
        method: "POST",
        body: JSON.stringify(body),
        headers,
      });
      return (await response.json()) as Participant;
    },
    enterPublic: async (commerceId: string, anonymousId: string) => {
      const response = await fetch(`${BASE_URL}/v1/enter-queue/${commerceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonymousId }),
      });
      const json = (await response.json()) as {
        message?: string;
        error?: string;
      };
      if (!response.ok)
        throw new Error(json.message ?? "Erro ao entrar na fila");
      return json;
    },
    exit: async (commerceId: string) => {
      const response = await authApi(`/participants-queue/${commerceId}/exit`, {
        method: "DELETE",
      });
      return response.json();
    },
    removeNext: async (commerceId: string) => {
      const response = await authApi(`/participants-queue/${commerceId}/next`, {
        method: "DELETE",
      });
      return response.json();
    },
  };
};

export default participantService;
