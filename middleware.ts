import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Check if a path should be protected
function isProtectedPath(path: string) {
  const publicPaths = [
    '/login',
    '/api/auth/login',
    '/api/leads/webhook',   // External incoming leads
    '/api/twilio/',         // All Twilio webhooks
  ];
  
  // Exclude static Next.js internal files
  if (path.startsWith('/_next/') || path.includes('favicon.ico')) {
    return false;
  }

  // Allow explicitly public paths
  if (publicPaths.some(p => path.startsWith(p))) {
    return false;
  }

  return true;
}

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('sue_chef_auth');
  const path = request.nextUrl.pathname;

  // If the path is protected and user is NOT authenticated
  if (isProtectedPath(path) && !authCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already authenticated and visits the login page
  if (path === '/login' && authCookie?.value) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
