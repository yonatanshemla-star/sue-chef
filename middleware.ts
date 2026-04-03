import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function isProtectedPath(path: string) {
  const publicPaths = [
    '/login',
    '/api/auth/login',
    '/api/leads/webhook',
    '/api/twilio/',
  ];
  
  if (path.startsWith('/_next/') || path.includes('favicon.ico')) {
    return false;
  }

  if (publicPaths.some(p => path.startsWith(p))) {
    return false;
  }

  return true;
}

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('sue_chef_auth');
  const path = request.nextUrl.pathname;
  const rawRole = authCookie?.value;
  // Treat legacy 'authenticated' value as admin
  const role = rawRole === 'authenticated' ? 'admin' : rawRole;

  // If the path is protected and user is NOT authenticated
  if (isProtectedPath(path) && !role) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already authenticated and visits the login page
  if (path === '/login' && role) {
    if (role === 'lawyer') {
      return NextResponse.redirect(new URL('/lawyer', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Lawyer trying to access admin pages — redirect to /lawyer
  if (role === 'lawyer' && !path.startsWith('/lawyer') && !path.startsWith('/api/lawyer') && !path.startsWith('/api/auth') && path !== '/login') {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/lawyer', request.url));
  }

  // Admin trying to access /lawyer page — allow (admin can see everything)
  // No restriction needed

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
