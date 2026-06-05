import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Single gate for the whole app. Unauthenticated users are bounced to /login
// (pages) or get a 401 (API). Authenticated users visiting /login are sent home.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required.
  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (pathname.startsWith("/q/") || pathname.startsWith("/api/public/")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const isLoginPage = pathname === "/login";

  if (!session && !isLoginPage) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|dex-logo.png|manifest.webmanifest|car-template.svg).*)"],
};
