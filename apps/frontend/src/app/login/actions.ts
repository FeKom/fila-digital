"use server";
import userService from "@/services/user";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const submitLoginForm = async (
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  let access_token: string;
  let refresh_token: string;

  try {
    const response = await userService().login({ email, password });
    if (!response.access_token) {
      if (
        response.message === "User Not Found" ||
        response.message === "Invalid User"
      ) {
        return { error: "E-mail ou senha inválidos." };
      }
      return { error: response.message ?? "E-mail ou senha inválidos." };
    }
    access_token = response.access_token;
    refresh_token = response.refresh_token;
  } catch {
    return { error: "Erro ao tentar fazer login. Tente novamente." };
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

  redirect("/");
};
