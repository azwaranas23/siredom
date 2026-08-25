import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js static assets bypass
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Redirect legacy /wasit routes to /play
  if (pathname.startsWith('/wasit')) {
    return NextResponse.redirect(new URL('/play', request.url));
  }

  // Mutating API calls require an authenticated session (wasit/admin/superadmin).
  // GET tetap terbuka untuk portal wasit & Leaderboard TV.
  const isMutatingApi =
    request.method !== 'GET' &&
    (pathname.startsWith('/api/matches') ||
      pathname.startsWith('/api/tables') ||
      pathname.startsWith('/api/tenants'));

  if (isMutatingApi) {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json(
        { status: 'error', message: 'Tidak terautentikasi. Masuk melalui /play atau /login terlebih dahulu.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Admin portal: butuh sesi role admin atau superadmin
  if (pathname.startsWith('/admin')) {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session || (session.role !== 'admin' && session.role !== 'superadmin')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Super Admin portal: khusus role superadmin
  if (pathname.startsWith('/superadmin')) {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session || session.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/matches',
    '/api/tables',
    '/api/tenants',
  ],
};
