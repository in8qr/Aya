import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const nextIntlMiddleware = createMiddleware(routing);

const adminPrefix = "/admin";
const teamPrefix = "/team";
const customerPrefixes = ["/bookings", "/booking"];
const localePrefix = "/:locale(en|ar)";

function getLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "en" || segments[0] === "ar") return segments[0];
  return "en";
}

function pathWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "en" || segments[0] === "ar") return "/" + segments.slice(1).join("/");
  return pathname;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const pathNoLocale = pathWithoutLocale(path);

  // Run next-intl first (handles locale redirect/rewrite)
  const response = nextIntlMiddleware(request);

  // Auth checks (path includes locale: /en/admin, /ar/booking, etc.)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const locale = getLocaleFromPath(path);

  if (pathNoLocale.startsWith(adminPrefix)) {
    if (!token) {
      const signIn = new URL(`/${locale}/login`, request.url);
      signIn.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(signIn);
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
    return response;
  }

  if (pathNoLocale.startsWith(teamPrefix)) {
    if (!token) {
      const signIn = new URL(`/${locale}/login`, request.url);
      signIn.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(signIn);
    }
    if (token.role !== "ADMIN" && token.role !== "TEAM") {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
    return response;
  }

  const isCustomerProtected = customerPrefixes.some((p) => pathNoLocale.startsWith(p));
  if (isCustomerProtected) {
    if (!token) {
      const signIn = new URL(`/${locale}/login`, request.url);
      signIn.searchParams.set("callbackUrl", path);
      return NextResponse.redirect(signIn);
    }
    if (token.role !== "ADMIN" && token.role !== "TEAM" && token.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
