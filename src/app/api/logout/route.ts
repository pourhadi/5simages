import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';

/**
 * Sign out the current user by clearing session cookie.
 */
export async function POST() {
  const supabase = createRouteHandlerSupabaseClient({ cookies, headers });
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('LOGOUT_ERROR', error);
    return new NextResponse(error.message, { status: 500 });
  }
  return NextResponse.json({ success: true });
}