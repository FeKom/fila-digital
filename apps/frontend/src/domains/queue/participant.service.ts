import { authApi } from "@/lib/api";
import { Participant } from "@/types";

const participantService = () => {
  return {
    list: async (commerceId: string) => {
      const response = await authApi(`/participants-queue/${commerceId}`);
      const json = (await response.json()) as {
        data?: { participants?: Participant[] };
      };
      return json.data?.participants ?? [];
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
