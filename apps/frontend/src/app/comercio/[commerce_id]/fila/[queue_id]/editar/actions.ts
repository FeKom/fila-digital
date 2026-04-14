"use server";
import queueService from "@/services/queue";
import { authApi } from "@/lib/api";
import { Queue, QueueInput } from "@/types";
import { redirect } from "next/navigation";

export const getQueue = async (commerceId: string, queueId: string) => {
  const response = await authApi(`/queue/${commerceId}/${queueId}`);
  return (await response.json()) as Queue;
};

export const updateQueue = async (
  commerceId: string,
  queueId: string,
  formData: FormData
) => {
  const data: Partial<QueueInput> = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    type: formData.get("type") as "ephemera" | "permanent",
    status: formData.get("status") as "open" | "closed",
  };

  await queueService().update(commerceId, queueId, data);
  redirect(`/comercio/${commerceId}`);
};
