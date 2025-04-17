import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';

/**
 * Sign out the current user by clearing session cookie.
 */
export async function POST() {
  // Initialize Supabase client with awaited cookies and headers
  const cookieStore = await cookies();
  const headerStore = headers();
  const supabase = createRouteHandlerSupabaseClient({
    cookies: () => cookieStore,
    headers: () => headerStore,
  });
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('LOGOUT_ERROR', error);
    return new NextResponse(error.message, { status: 500 });
  }
  // Clear the Supabase auth cookie to fully sign out the user
  const response = NextResponse.json({ success: true });
  response.cookies.set('supabase-auth-token', '', {
    httpOnly: false,
    path: '/',
    // Expire cookie immediately
    expires: new Date(0),
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}