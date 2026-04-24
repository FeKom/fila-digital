"use server";
import commerceService from "@/services/commerce";
import { authApi } from "@/lib/api";
import { Commerce, UserQueue } from "@/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

export const isAuthenticated = async (): Promise<boolean> => {
  const cookieStore = await cookies();
  return !!cookieStore.get("digital_queue_jwt")?.value;
};

export const logout = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("digital_queue_jwt");
  cookieStore.delete("digital_queue_refresh");
  redirect("/login");
};
