import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/admin", "/cart", "/orders"];
const adminRoutes = ["/admin"];
const authRoutes = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];

export async function proxy(req: NextRequest) {
  const session = await auth();
  const path = req.nextUrl.pathname;

  const isProtected = protectedRoutes.some((r) => path.startsWith(r));
  const isAdminRoute = adminRoutes.some((r) => path.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => path.startsWith(r));

  if (isProtected && !session?.user) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isAdminRoute && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  if (isAuthRoute && session?.user) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
