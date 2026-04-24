"use server";
import commerceService from "@/services/commerce";
import { redirect } from "next/navigation";

export const createCommerce = async (
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> => {
  const data = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    phone: formData.get("phone") as string,
    document_id: formData.get("document_id") as string,
    open_at: formData.get("open_at") as string,
    closed_at: formData.get("closed_at") as string,
  };

  let commerceId: string;
  try {
    const commerce = await commerceService().register(data);
    if (!commerce.id) {
      return {
        error:
          "Erro ao cadastrar comércio. Verifique os dados e tente novamente.",
      };
    }
    commerceId = commerce.id;
  } catch {
    return { error: "Erro ao cadastrar comércio. Tente novamente." };
  }

  redirect(`/comercio/${commerceId}`);
};
