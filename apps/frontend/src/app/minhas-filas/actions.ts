"use server";
import { authApi } from "@/lib/api";
import participantService from "@/services/participant";
import { UserQueue } from "@/types";
import { revalidatePath } from "next/cache";

export const getUserQueues = async (): Promise<UserQueue[]> => {
  try {
    const response = await authApi("/user/queues");
    const json = (await response.json()) as {
      data?: { userQueues?: UserQueue[] };
    };
    return json.data?.userQueues ?? [];
  } catch {
    return [];
  }
};

export const exitQueue = async (commerceId: string) => {
  await participantService().exit(commerceId);
  revalidatePath("/minhas-filas");
};
