import api from "../lib/api";

const userService = () => {
  return {
    register: async ({
      name,
      phone,
      password,
      email,
    }: {
      name: string;
      phone: string;
      password: string;
      email: string;
    }) => {
      const body = { email, password, name, phone };
      const headers = new Headers({ "Content-Type": "application/json" });
      const response = await api("/user/register", {
        body: JSON.stringify(body),
        headers,
        method: "POST",
      });
      const data = (await response.json()) as { token: string; message?: string };
      if (!response.ok) return { token: "", message: data.message };
      return data;
    },
    login: async ({ email, password }: { email: string; password: string }) => {
      try {
        const body = { email, password };
        const headers = new Headers({ "Content-Type": "application/json" });
        const response = await api("/user/login", {
          body: JSON.stringify(body),
          headers,
          method: "POST",
        });
        const data = (await response.json()) as { token: string; message?: string };
        if (!response.ok) return { token: "", message: data.message };
        return data;
      } catch (error) {
        console.error("[login] fetch failed:", error);
        return { token: "", message: undefined };
      }
    },
  };
};

export default userService;
