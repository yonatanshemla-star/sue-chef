import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = (process.env.ADMIN_PASSWORD || 'admin123').toUpperCase();
    const lawyerPassword = (process.env.LAWYER_PASSWORD || '').toUpperCase();
    const inputPassword = (password || '').toUpperCase();

    let role: 'admin' | 'lawyer' | null = null;

    if (inputPassword === adminPassword) {
      role = 'admin';
    } else if (lawyerPassword && inputPassword === lawyerPassword) {
      role = 'lawyer';
    }

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'סיסמה שגויה' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true, role });

    // Set the auth cookie with role (expires in 30 days)
    response.cookies.set({
      name: 'sue_chef_auth',
      value: role,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
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
