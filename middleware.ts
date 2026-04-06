import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookies = req.cookies;
  const hasSession = cookies.getAll().some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  const protectedRoutes = ['/dashboard', '/group'];
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r));
  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/group/:path*', '/login'] };