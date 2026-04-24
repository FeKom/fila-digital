import { cookies } from "next/headers";

const API_VERSION = "/v1";
const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

const api = (path?: string, options?: RequestInit) => {
  return fetch(`${BASE_URL}${API_VERSION}${path}`, options);
};

export const authApi = async (path: string, options?: RequestInit) => {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("digital_queue_jwt")?.value;
  const refreshToken = cookieStore.get("digital_queue_refresh")?.value;

  const buildHeaders = (token?: string) => {
    const headers = new Headers(options?.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };

  let response = await api(path, {
    ...options,
    headers: buildHeaders(accessToken),
  });

  if (response.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${BASE_URL}${API_VERSION}/user/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as {
        access_token: string;
        refresh_token: string;
      };
      accessToken = data.access_token;
      cookieStore.set("digital_queue_jwt", data.access_token, {
        httpOnly: true,
        path: "/",
        expires: new Date(Date.now() + 15 * 60 * 1000),
      });
      cookieStore.set("digital_queue_refresh", data.refresh_token, {
        httpOnly: true,
        path: "/",
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      response = await api(path, {
        ...options,
        headers: buildHeaders(accessToken),
      });
    }
  }

  return response;
};

export default api;
