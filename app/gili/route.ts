import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL('/lawyer', request.url));

  // Set the sue_chef_auth cookie to 'lawyer' for 30 days
  response.cookies.set({
    name: 'sue_chef_auth',
    value: 'lawyer',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return response;
}
