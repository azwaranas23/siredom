import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js static asset & API bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/login' ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Handle legacy /play/* route redirects to /wasit/*
  if (pathname.startsWith('/play/live')) {
    return NextResponse.redirect(new URL('/wasit/live', request.url));
  }
  if (pathname.startsWith('/play/setup')) {
    return NextResponse.redirect(new URL('/wasit/setup', request.url));
  }
  if (pathname.startsWith('/play/audit')) {
    return NextResponse.redirect(new URL('/wasit/audit', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
