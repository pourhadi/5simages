import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';

/**
 * Sign in a user via Supabase Auth and set session cookie.
 */
export async function POST(request: Request) {
  // Initialize Supabase client with awaited cookies and headers
  const cookieStore = await cookies();
  const headerStore = headers();
  const supabase = createRouteHandlerSupabaseClient({
    cookies: () => cookieStore,
    headers: () => headerStore,
  });
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return new NextResponse('Missing email or password', { status: 400 });
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error || !data.session) {
      return new NextResponse(error?.message || 'Failed to sign in', { status: 400 });
    }
    // Manually set Supabase auth cookie with session tokens
    const session = data.session;
    // Manually extract potential multi-factor info (if present) and build the cookie value
    const maybeFactors = (session.user as unknown as Record<string, unknown>).factors;
    const factors = Array.isArray(maybeFactors) ? maybeFactors : [];
    const cookieValue = JSON.stringify([
      session.access_token,
      session.refresh_token,
      session.provider_token ?? '',
      session.provider_refresh_token ?? '',
      factors
    ]);
    // Create JSON response and attach cookie
    const response = NextResponse.json({ user: data.user });
    response.cookies.set('supabase-auth-token', cookieValue, {
      httpOnly: false,
      maxAge: session.expires_in,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (error) {
    console.error('LOGIN_ERROR', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Error',
      { status: 500 }
    );
  }
}