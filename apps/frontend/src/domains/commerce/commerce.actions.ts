"use server";
import commerceService from "@/domains/commerce/commerce.service";
import { authApi } from "@/lib/api";
import { Commerce, CommerceAdmin, CommerceInput, UserQueue } from "@/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const getUserCommerces = async (): Promise<Commerce[]> => {
  try {
    return await commerceService().getUserCommerces();
  } catch {
    return [];
  }
};

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

export const getCommerce = async (
  commerceId: string
): Promise<Commerce | null> => {
  try {
    return await commerceService().getById(commerceId);
  } catch {
    return null;
  }
};

export const createCommerce = async (
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> => {
  const latRaw = formData.get("latitude") as string;
  const lngRaw = formData.get("longitude") as string;
  const data: CommerceInput = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    phone: formData.get("phone") as string,
    document_id: formData.get("document_id") as string,
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

  redirect(`/comercio/${commerceId}/dashboard`);
};

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
  redirect(`/comercio/${commerceId}/dashboard`);
};

export const deleteCommerce = async (
  commerceId: string
): Promise<{ error?: string }> => {
  try {
    await commerceService().delete(commerceId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Erro ao excluir comércio",
    };
  }
  redirect("/");
};

export const isAuthenticated = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  return !!cookieStore.get("digital_queue_jwt")?.value;
};

export const callNextParticipant = async (
  commerceId: string,
  count: number = 1
): Promise<{ error?: string }> => {
  const path =
    count === 1
      ? `/participants-queue/${commerceId}/next`
      : `/participants-queue/${commerceId}/next/${count}`;
  const response = await authApi(path, { method: "DELETE" });
  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    return { error: json.message ?? "Falha ao chamar próximo" };
  }
  revalidatePath(`/comercio/${commerceId}`);
  return {};
};

export const listAdmins = async (
  commerceId: string
): Promise<CommerceAdmin[]> => {
  try {
    const response = await authApi(`/commerce/${commerceId}/admins`);
    const json = (await response.json()) as { data?: CommerceAdmin[] };
    return json.data ?? [];
  } catch {
    return [];
  }
};

export const grantAdmin = async (
  commerceId: string,
  email: string
): Promise<{ error?: string }> => {
  const response = await authApi(`/commerce/${commerceId}/admins`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    return { error: json.message ?? "Falha ao conceder acesso" };
  }
  revalidatePath(`/comercio/${commerceId}`);
  return {};
};

export const revokeAdmin = async (
  commerceId: string,
  personId: string
): Promise<{ error?: string }> => {
  const response = await authApi(`/commerce/${commerceId}/admins/${personId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    return { error: json.message ?? "Falha ao remover acesso" };
  }
  revalidatePath(`/comercio/${commerceId}`);
  return {};
};

export const revertParticipants = async (
  commerceId: string,
  count: number = 1
): Promise<{ error?: string }> => {
  const path =
    count === 1
      ? `/participants-queue/${commerceId}/revert`
      : `/participants-queue/${commerceId}/revert/${count}`;
  const response = await authApi(path, { method: "PUT" });
  if (!response.ok) {
    const json = (await response.json()) as { message?: string };
    return { error: json.message ?? "Falha ao reverter" };
  }
  revalidatePath(`/comercio/${commerceId}`);
  return {};
};
