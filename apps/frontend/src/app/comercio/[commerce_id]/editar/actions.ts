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
    open_at: formData.get("open_at") as string,
    closed_at: formData.get("closed_at") as string,
    street: (formData.get("street") as string) || null,
    number: (formData.get("number") as string) || null,
    complement: (formData.get("complement") as string) || null,
    neighborhood: (formData.get("neighborhood") as string) || null,
    city: (formData.get("city") as string) || null,
    state: (formData.get("state") as string) || null,
    cep: (formData.get("cep") as string) || null,
    latitude: latRaw ? parseFloat(latRaw) : null,
    longitude: lngRaw ? parseFloat(lngRaw) : null,
  };

  await commerceService().update(commerceId, data);
  redirect(`/comercio/${commerceId}`);
};
