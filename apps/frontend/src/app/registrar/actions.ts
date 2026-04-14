"use server";
import userService from "@/services/user";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

  if (!email || !password || !name || !phone) {
    return { error: "Preencha todos os campos." };
  }

  let token: string;

  try {
    const response = await userService().register({ email, password, name, phone });
    if (!response.token) {
      return { error: translateError(response.message) };
    }
    token = response.token;
  } catch {
    return { error: "Erro ao tentar criar conta. Tente novamente." };
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
