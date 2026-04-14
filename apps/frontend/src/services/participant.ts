import { authApi } from "@/lib/api";
import api from "@/lib/api";
import { Participant } from "@/types";

const participantService = () => {
  return {
    list: async (commerceId: string) => {
      const response = await authApi(`/participants-queue/${commerceId}`);
      return (await response.json()) as Participant[];
    },
    enter: async (data: {
      queueId: string;
      qrcodeToken: string;
      userId?: string;
      anonymousId?: string;
    }) => {
      const body = {
        queue_id: data.queueId,
        qrcode_token: data.qrcodeToken,
        user_id: data.userId,
        anonymous_id: data.anonymousId,
      };
      const headers = new Headers({ "Content-Type": "application/json" });
      const response = await api("/enter-queue", {
        method: "POST",
        body: JSON.stringify(body),
        headers,
      });
      return (await response.json()) as Participant;
    },
    exit: async (commerceId: string) => {
      const response = await authApi(
        `/participants-queue/${commerceId}/exit`,
        {
          method: "DELETE",
        }
      );
      return response.json();
    },
    removeNext: async (commerceId: string) => {
      const response = await authApi(
        `/participants-queue/${commerceId}/next`,
        {
          method: "DELETE",
        }
      );
      return response.json();
    },
  };
};

export default participantService;
