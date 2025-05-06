import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';

/**
 * Send a password reset email via Supabase Auth
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createRouteHandlerSupabaseClient({
    cookies: () => cookieStore,
    headers: () => headerStore,
  });
  try {
    const { email } = await request.json();
    if (!email) {
      return new NextResponse('Email is required', { status: 400 });
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const redirectTo = siteUrl
      ? `${siteUrl.replace(/\/+$/, '')}/reset-password`
      : undefined;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) {
      return new NextResponse(error.message, { status: 400 });
    }
    return NextResponse.json(
      { message: 'Password reset email sent. Please check your inbox.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('FORGOT_PASSWORD_ERROR', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Error',
      { status: 500 }
    );
  }
}