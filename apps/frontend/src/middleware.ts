import { NextRequest, NextResponse } from "next/server";

const protectedPaths = ["/comercio", "/minhas-filas", "/perfil"];
const publicPaths = ["/login", "/registrar", "/entrar-fila"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("digital_queue_jwt")?.value;
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );

  const isPublicAuth = publicPaths.some((path) =>
    pathname.startsWith(path)
  );

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicAuth && token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/comercio/:path*",
    "/minhas-filas",
    "/perfil",
    "/login",
    "/registrar",
  ],
};
