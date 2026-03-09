import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password !== correctPassword) {
      return NextResponse.json(
        { success: false, error: 'סיסמה שגויה' },
        { status: 401 }
      );
    }

    // Create the response object
    const response = NextResponse.json({ success: true });

    // Set the auth cookie (expires in 30 days)
    response.cookies.set({
      name: 'sue_chef_auth',
      value: 'authenticated',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'שגיאה בהתחברות' },
      { status: 500 }
    );
  }
}
