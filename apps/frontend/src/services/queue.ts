import { authApi } from "@/lib/api";
import { Queue, QueueInput } from "@/types";

const queueService = () => {
  return {
    register: async (data: QueueInput & { commerce_id: string }) => {
      const response = await authApi("/queue/register", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return (await response.json()) as Queue;
    },
    update: async (
      commerceId: string,
      queueId: string,
      data: Partial<QueueInput>
    ) => {
      const response = await authApi(
        `/queue/${commerceId}/${queueId}/update`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );
      return (await response.json()) as Queue;
    },
    delete: async (commerceId: string, queueId: string) => {
      const response = await authApi(
        `/queue/${commerceId}/${queueId}/delete`,
        {
          method: "DELETE",
        }
      );
      return response.json();
    },
  };
};

export default queueService;
