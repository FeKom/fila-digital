"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const logout = async () => {
  const cookieStore = await cookies();
  cookieStore.delete("digital_queue_jwt");
  cookieStore.delete("digital_queue_refresh");
  redirect("/login");
};
