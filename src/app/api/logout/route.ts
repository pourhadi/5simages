import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Sign out the current user by clearing session cookie.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // This is expected in route handlers
            }
          },
        },
      }
    );

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('LOGOUT_ERROR', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create response
    const response = NextResponse.json({ success: true });
    
    // Clear all Supabase auth cookies
    cookieStore.getAll().forEach(cookie => {
      if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
        response.cookies.set({
          name: cookie.name,
          value: '',
          expires: new Date(0),
          path: '/'
        });
      }
    });
    
    return response;
  } catch (error) {
    console.error('LOGOUT_ERROR', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Error'
    }, { status: 500 });
  }
}