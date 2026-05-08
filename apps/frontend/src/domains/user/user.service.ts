import api, { authApi } from "@/lib/api";
import { User } from "@/types";

const userService = () => {
  return {
    getMe: async (): Promise<User | null> => {
      try {
        const response = await authApi("/user");
        if (!response.ok) return null;
        return (await response.json()) as User;
      } catch {
        return null;
      }
    },
    update: async (data: {
      name?: string;
      phone?: string;
    }): Promise<{ error?: string }> => {
      const response = await authApi("/user/update", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const json = (await response.json()) as { message?: string };
        return { error: json.message ?? "Erro ao atualizar perfil" };
      }
      return {};
    },
    deleteAccount: async (): Promise<{ error?: string }> => {
      const response = await authApi("/user/delete", { method: "DELETE" });
      if (!response.ok) {
        const json = (await response.json()) as { message?: string };
        return { error: json.message ?? "Erro ao excluir conta" };
      }
      return {};
    },
    register: async ({
      name,
      phone,
      password,
      email,
      anonymousId,
    }: {
      name: string;
      phone: string;
      password: string;
      email: string;
      anonymousId?: string;
    }) => {
      try {
        const body = { email, password, name, phone };
        const headers = new Headers({ "Content-Type": "application/json" });
        if (anonymousId) headers.set("X-Anonymous-Id", anonymousId);
        const response = await api("/user/register", {
          body: JSON.stringify(body),
          headers,
          method: "POST",
          signal: AbortSignal.timeout(10000),
        });
        const data = (await response.json()) as {
          access_token: string;
          refresh_token: string;
          message?: string;
        };
        if (!response.ok)
          return { access_token: "", refresh_token: "", message: data.message };
        return data;
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError") {
          return {
            access_token: "",
            refresh_token: "",
            message: "__timeout__",
          };
        }
        throw error;
      }
    },
    login: async ({ email, password }: { email: string; password: string }) => {
      try {
        const body = { email, password };
        const headers = new Headers({ "Content-Type": "application/json" });
        const response = await api("/user/login", {
          body: JSON.stringify(body),
          headers,
          method: "POST",
          signal: AbortSignal.timeout(10000),
        });
        const data = (await response.json()) as {
          access_token: string;
          refresh_token: string;
          message?: string;
        };
        if (!response.ok)
          return { access_token: "", refresh_token: "", message: data.message };
        return data;
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError") {
          return {
            access_token: "",
            refresh_token: "",
            message: "__timeout__",
          };
        }
        console.error("[login] fetch failed:", error);
        return { access_token: "", refresh_token: "", message: undefined };
      }
    },
  };
};

export default userService;
