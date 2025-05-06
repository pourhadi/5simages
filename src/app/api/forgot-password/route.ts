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
    // Determine target URL for resetting password in the email
    let redirectTo: string | undefined;
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      redirectTo = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '') + '/reset-password';
    } else if (process.env.VERCEL_URL) {
      redirectTo = `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}/reset-password`;
    }
    // Send reset email; include redirectTo only when defined to ensure a proper link
    let resetResult;
    if (redirectTo) {
      resetResult = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    } else {
      console.warn('FORGOT_PASSWORD: No NEXT_PUBLIC_SITE_URL or VERCEL_URL set; using default redirect');
      resetResult = await supabase.auth.resetPasswordForEmail(email);
    }
    const { error } = resetResult;
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