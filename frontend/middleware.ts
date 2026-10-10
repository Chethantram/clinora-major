import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register") ||
    pathname.startsWith("/aiuth/login") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/register") {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/login" ? "/auth/login" : "/auth/register";
    return NextResponse.redirect(url);
  }

  const sessionToken = req.cookies.get("medai_auth")?.value || "";
  const isLoggedIn = /^[a-f0-9]{64}$/i.test(sessionToken);

  if (!isLoggedIn && !isPublicPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isPublicPath(pathname) && pathname !== "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
