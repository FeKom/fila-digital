import { authApi } from "@/lib/api";
import { Participant, ParticipantsListResponse } from "@/types";

const participantService = () => {
  return {
    list: async (commerceId: string): Promise<Participant[]> => {
      const response = await authApi(`/participants-queue/${commerceId}`);
      const json = (await response.json()) as Partial<ParticipantsListResponse>;
      return json.data?.participants ?? [];
    },
    exit: async (commerceId: string) => {
      const response = await authApi(`/participants-queue/${commerceId}/exit`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(json.message ?? "Erro ao sair da fila");
      }
    },
    removeNext: async (commerceId: string) => {
      const response = await authApi(`/participants-queue/${commerceId}/next`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(json.message ?? "Erro ao remover participante");
      }
    },
  };
};

export default participantService;
