import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url));

  // Set the sue_chef_auth cookie to 'admin' for 30 days
  response.cookies.set({
    name: 'sue_chef_auth',
    value: 'admin',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
