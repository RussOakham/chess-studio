// Next.js proxy for route protection

import type { NextRequest } from "next/server";

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

// oxlint-disable-next-line import/group-exports
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/register", "/api/auth"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check for session cookie using Better Auth helper
  // Note: This is an optimistic check for redirects only.
  // Always validate sessions on protected pages/routes.
  const sessionCookie = getSessionCookie(request);

  // If no session cookie and trying to access protected route, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// oxlint-disable-next-line import/group-exports
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    // oxlint-disable-next-line unicorn/prefer-string-raw
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
