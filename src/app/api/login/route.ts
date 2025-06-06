import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * Sign in a user via Supabase Auth and set session cookie.
 */
export async function POST(request: Request) {
  // Initialize Supabase client with awaited cookies and headers
  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createRouteHandlerSupabaseClient({
    cookies: () => cookieStore,
    headers: () => headerStore,
  });
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'Failed to sign in' }, { status: 400 });
    }
    // Session from Supabase after successful sign-in
    const session = data.session;
    // Ensure user exists in our database (after email confirmation)
    try {
      const existingUser = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: session.user.id,
            email: session.user.email ?? '',
            // Use name from Supabase user_metadata if present and a string
            name: typeof session.user.user_metadata.name === 'string'
              ? session.user.user_metadata.name
              : '',
            credits: 5,
            isAdmin: false
          }
        });
      }
    } catch (dbError) {
      console.error('DB user creation error during login:', dbError);
    }
    // Manually set Supabase auth cookie with session tokens
    // Extract potential multi-factor info (if present) and build the cookie value
    const maybeFactors = session.user.factors;
    const factors = Array.isArray(maybeFactors) ? maybeFactors : [];
    const cookieValue = JSON.stringify([
      session.access_token,
      session.refresh_token,
      session.provider_token ?? '',
      session.provider_refresh_token ?? '',
      factors
    ]);
    // Get user data from database for credits info
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    
    // Create JSON response with token and user info for mobile app compatibility
    const responseData = {
      token: session.access_token,
      user: {
        id: session.user.id,
        email: session.user.email,
        credits: dbUser?.credits ?? 5,
        isAdmin: dbUser?.isAdmin ?? false,
        createdAt: dbUser?.createdAt ?? new Date().toISOString()
      }
    };
    
    const response = NextResponse.json(responseData);
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
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Error'
    }, { status: 500 });
  }
}