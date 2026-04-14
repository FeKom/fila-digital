import { cookies } from "next/headers";

const API_VERSION = "/v1";

const api = (path?: string, options?: RequestInit) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";
  return fetch(`${baseUrl}${API_VERSION}${path}`, options);
};

export const authApi = async (path: string, options?: RequestInit) => {
  const cookieStore = await cookies();
  const token = cookieStore.get("digital_queue_jwt")?.value;

  const headers = new Headers(options?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return api(path, { ...options, headers });
};

export default api;
