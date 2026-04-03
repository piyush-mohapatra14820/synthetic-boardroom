import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = req.nextUrl;
  const protectedRoutes = ['/dashboard', '/group'];
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r));
  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  return res;
}

export const config = { matcher: ['/dashboard/:path*', '/group/:path*', '/login'] };