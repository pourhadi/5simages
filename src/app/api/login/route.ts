import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';

/**
 * Sign in a user via Supabase Auth and set session cookie.
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerSupabaseClient({ cookies, headers });
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
    // Session cookie is automatically set on server
    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error('LOGIN_ERROR', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Error',
      { status: 500 }
    );
  }
}