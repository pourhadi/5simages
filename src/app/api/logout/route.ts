import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Sign out the current user by clearing session cookie.
 */
export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('LOGOUT_ERROR', error);
    return new NextResponse(error.message, { status: 500 });
  }
  return NextResponse.json({ success: true });
}