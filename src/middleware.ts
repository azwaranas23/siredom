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
    pathname === '/' ||
    pathname.startsWith('/play')
  ) {
    return NextResponse.next();
  }

  // Redirect legacy /wasit routes to /play
  if (pathname.startsWith('/wasit')) {
    return NextResponse.redirect(new URL('/play', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
