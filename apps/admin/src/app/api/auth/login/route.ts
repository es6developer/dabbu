import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dabbu-1ff9.onrender.com/api/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, totpCode } = body;

    const endpoint = totpCode ? '/admin/auth/login-mfa' : '/admin/auth/login';
    const payload = totpCode ? { email, password, totpCode } : { email, password };

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      return NextResponse.json(json, { status: res.status });
    }

    if (json.data?.mfaRequired) {
      return NextResponse.json(json);
    }

    const response = NextResponse.json(json);

    response.cookies.set('admin_token', json.data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Login failed' },
      { status: 500 },
    );
  }
}
