"use server";
import commerceService from "@/services/commerce";
import { redirect } from "next/navigation";

export const createCommerce = async (formData: FormData) => {
  const data = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    phone: formData.get("phone") as string,
    document_id: formData.get("document_id") as string,
    open_at: formData.get("open_at") as string,
    closed_at: formData.get("closed_at") as string,
  };

  const commerce = await commerceService().register(data);
  redirect(`/comercio/${commerce.id}`);
};
