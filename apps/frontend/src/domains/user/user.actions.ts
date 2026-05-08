"use server";
import userService from "@/domains/user/user.service";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { User } from "@/types";

export const getProfile = async (): Promise<User | null> => {
  return userService().getMe();
};

export const updateProfile = async (
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> => {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const result = await userService().update({ name, phone });
  if (result.error) return { error: result.error };
  revalidatePath("/perfil");
  return { error: null };
};

export const deleteAccount = async () => {
  const result = await userService().deleteAccount();
  if (result.error) return { error: result.error };
  const cookieStore = await cookies();
  cookieStore.delete("digital_queue_jwt");
  cookieStore.delete("digital_queue_refresh");
  redirect("/");
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
      if (response.message === "__timeout__") {
        return {
          error:
            "O servidor está iniciando. Aguarde ~30 segundos e tente novamente.",
        };
      }
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

  redirect("/meus-comercios");
};

const translateError = (message: string | undefined): string => {
  if (!message) return "Erro ao criar conta. Tente novamente.";
  const map: Record<string, string> = {
    "Invalid Password. Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character":
      "Senha inválida. Use no mínimo 8 caracteres.",
    "Invalid Password": "Senha inválida. Use no mínimo 8 caracteres.",
    "Invalid Name": "Nome inválido. Informe entre 2 e 100 caracteres.",
    "Invalid Email": "E-mail inválido.",
    "Invalid Phone":
      "Telefone inválido. Use o formato: (11) 99999-9999 ou +5511999999999",
    "User Already Exists": "Já existe uma conta com este e-mail ou telefone.",
    "Failed to create User!": "Erro interno. Tente novamente mais tarde.",
  };
  return map[message] ?? message;
};

export const submitRegisterForm = async (
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const anonymousId = formData.get("anonymousId") as string | null;

  if (!email || !password || !name || !phone) {
    return { error: "Preencha todos os campos." };
  }

  let access_token: string;
  let refresh_token: string;

  try {
    const response = await userService().register({
      email,
      password,
      name,
      phone,
      anonymousId: anonymousId ?? undefined,
    });
    if (!response.access_token) {
      if (response.message === "__timeout__") {
        return {
          error:
            "O servidor está iniciando. Aguarde ~30 segundos e tente novamente.",
        };
      }
      return { error: translateError(response.message) };
    }
    access_token = response.access_token;
    refresh_token = response.refresh_token;
  } catch {
    return { error: "Erro ao tentar criar conta. Tente novamente." };
  }

  const in15min = new Date(Date.now() + 15 * 60 * 1000);
  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const cookieStore = await cookies();
  cookieStore.set({
    name: "digital_queue_jwt",
    value: access_token,
    httpOnly: true,
    path: "/",
    expires: in15min,
  });
  cookieStore.set({
    name: "digital_queue_refresh",
    value: refresh_token,
    httpOnly: true,
    path: "/",
    expires: in30days,
  });

  redirect("/meus-comercios");
};
