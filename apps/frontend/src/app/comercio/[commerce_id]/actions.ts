"use server";
import commerceService from "@/services/commerce";
import participantService from "@/services/participant";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const getCommerce = async (commerceId: string) => {
  return await commerceService().getById(commerceId);
};

export const getParticipants = async (commerceId: string) => {
  try {
    return await participantService().list(commerceId);
  } catch {
    return [];
  }
};

export const deleteCommerce = async (commerceId: string) => {
  await commerceService().delete(commerceId);
  redirect("/");
};

export const callNextParticipant = async (commerceId: string) => {
  await participantService().removeNext(commerceId);
  revalidatePath(`/comercio/${commerceId}`);
};
