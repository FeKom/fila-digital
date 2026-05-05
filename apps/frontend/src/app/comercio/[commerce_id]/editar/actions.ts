"use server";
import commerceService from "@/services/commerce";
import { redirect } from "next/navigation";

export const updateCommerce = async (
  commerceId: string,
  formData: FormData
) => {
  const latRaw = formData.get("latitude") as string;
  const lngRaw = formData.get("longitude") as string;
  const data = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    phone: formData.get("phone") as string,
    document_id: formData.get("document_id") as string,
    open_at: formData.get("open_at") as string,
    closed_at: formData.get("closed_at") as string,
    latitude: latRaw ? parseFloat(latRaw) : null,
    longitude: lngRaw ? parseFloat(lngRaw) : null,
  };

  await commerceService().update(commerceId, data);
  redirect(`/comercio/${commerceId}`);
};
