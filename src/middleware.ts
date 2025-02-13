import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.has('auth_token'); // veya sizin kullandığınız token adı
  const isLoginPage = request.nextUrl.pathname === '/';

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/chat']
}; 