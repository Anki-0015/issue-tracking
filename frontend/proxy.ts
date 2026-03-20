import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/dashboard', '/profile', '/issues'];
const authRoutes = ['/login', '/signup'];

function applyNoStoreHeaders(response: NextResponse): NextResponse {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  if (pathname === '/') {
    const target = token ? '/dashboard' : '/login';
    return applyNoStoreHeaders(NextResponse.redirect(new URL(target, request.url)));
  }

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return applyNoStoreHeaders(NextResponse.redirect(loginUrl));
  }

  if (isAuthRoute && token) {
    return applyNoStoreHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
  }

  return applyNoStoreHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/profile/:path*', '/issues/:path*', '/login', '/signup'],
};
