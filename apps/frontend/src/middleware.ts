import { NextRequest, NextResponse } from "next/server";

const protectedPaths = [
  "/comercio/criar",
  "/minhas-filas",
  "/meus-comercios",
  "/perfil",
];

// /comercio/[id] is public; management subpaths require auth
const isComercioManagement = (pathname: string) =>
  /^\/comercio\/[^/]+(\/dashboard|\/editar|\/fila)/.test(pathname);
const BASE_URL =
  process.env.NEXT_PUBLIC_FILA_DIGITAL_BASE_URL ?? "http://localhost:7070";

export async function middleware(request: NextRequest) {
  // Server action requests carry Next-Action header — never redirect them,
  // or the client receives a redirect instead of the action response.
  if (request.headers.has("Next-Action")) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("digital_queue_jwt")?.value;
  const refreshToken = request.cookies.get("digital_queue_refresh")?.value;
  const { pathname } = request.nextUrl;

  const isProtected =
    protectedPaths.some((path) => pathname.startsWith(path)) ||
    isComercioManagement(pathname);
  // No access token but refresh token exists — try a silent refresh
  if (!accessToken && refreshToken) {
    try {
      const res = await fetch(`${BASE_URL}/v1/user/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: AbortSignal.timeout(1000),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          access_token: string;
          refresh_token: string;
        };
        const response = NextResponse.next();
        response.cookies.set("digital_queue_jwt", data.access_token, {
          httpOnly: true,
          path: "/",
          expires: new Date(Date.now() + 15 * 60 * 1000),
        });
        response.cookies.set("digital_queue_refresh", data.refresh_token, {
          httpOnly: true,
          path: "/",
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        });
        return response;
      }
    } catch {
      // refresh failed (cold start / network) — treat as unauthenticated
    }
  }

  // Um refresh bem-sucedido retorna cedo acima, com os cookies novos já
  // gravados na resposta. Se a execução chegou até aqui, ou não havia refresh
  // token, ou a chamada falhou — em ambos os casos, não autenticado. Um
  // refreshToken velho sozinho não prova autenticação.
  const isAuthenticated = !!accessToken;

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/comercio/:path*",
    "/minhas-filas",
    "/meus-comercios",
    "/perfil",
    "/login",
    "/registrar",
  ],
};
