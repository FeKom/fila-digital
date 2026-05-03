"use server";
import { cookies } from "next/headers";

export const submitGoogleLogin = async (
  idToken: string
): Promise<{ error: string } | { success: true }> => {
  const apiUrl =
    process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

  let access_token: string;
  let refresh_token: string;

  try {
    const response = await fetch(`${apiUrl}/v1/user/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      return { error: data.message ?? "Erro ao autenticar com Google." };
    }

    access_token = data.access_token;
    refresh_token = data.refresh_token;
  } catch {
    return { error: "Erro ao conectar com o servidor. Tente novamente." };
  }

  const in15min = new Date(Date.now() + 15 * 60 * 1000);
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";

  cookieStore.set({
    name: "digital_queue_jwt",
    value: access_token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    expires: in15min,
  });
  cookieStore.set({
    name: "digital_queue_refresh",
    value: refresh_token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    expires: in30days,
  });

  return { success: true };
};
