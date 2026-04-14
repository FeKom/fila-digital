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

  let token: string;

  try {
    const response = await userService().login({ email, password });
    if (!response.token) {
      if (response.message === "User Not Found" || response.message === "Invalid User") {
        return { error: "E-mail ou senha inválidos." };
      }
      return { error: response.message ?? "E-mail ou senha inválidos." };
    }
    token = response.token;
  } catch {
    return { error: "Erro ao tentar fazer login. Tente novamente." };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const cookieStore = await cookies();
  cookieStore.set({
    name: "digital_queue_jwt",
    value: token,
    httpOnly: true,
    path: "/",
    expires: tomorrow,
  });

  redirect("/");
};
