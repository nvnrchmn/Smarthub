import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE_NAME,
  HOME_BY_ROLE,
  REFRESH_COOKIE_NAME,
  decodeToken,
  isTokenExpired,
} from "@/lib/auth";
import { PLATFORM_COOKIE_NAME, isPlatformTokenExpired } from "@/lib/platform-auth";
import { PUBLIC_PATH_SET } from "@/lib/public-paths";

// Daftar path publik ada di "@/lib/public-paths" agar tidak drift dengan robots.ts.
// "/" = landing; pengguna yang sudah masuk diarahkan di page.tsx.

export const middleware = (request: NextRequest): NextResponse => {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean((token && !isTokenExpired(token)) || refreshToken);

  const platformToken = request.cookies.get(PLATFORM_COOKIE_NAME)?.value;
  const isPlatformAuthenticated = Boolean(platformToken && !isPlatformTokenExpired(platformToken));

  if (pathname === "/platform/login") {
    if (isPlatformAuthenticated) {
      return NextResponse.redirect(new URL("/platform", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/platform" || pathname.startsWith("/platform/")) {
    if (!isPlatformAuthenticated) {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATH_SET.has(pathname)) {
    if (pathname === "/login" && isAuthenticated && token) {
      const claims = decodeToken(token);
      return NextResponse.redirect(
        new URL(claims ? HOME_BY_ROLE[claims.role] : "/dashboard", request.url),
      );
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|robots.txt|sitemap.xml|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
