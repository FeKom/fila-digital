"use server";
import queueService from "@/services/queue";
import { QueueInput } from "@/types";
import { revalidatePath } from "next/cache";

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
