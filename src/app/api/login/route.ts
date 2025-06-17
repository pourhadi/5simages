import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * Sign in a user via Supabase Auth and set session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    // Create Supabase client with proper cookie handling
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

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'Failed to sign in' }, { status: 400 });
    }

    // Session from Supabase after successful sign-in
    const session = data.session;

    // Ensure user exists in our database
    try {
      const existingUser = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: session.user.id,
            email: session.user.email ?? '',
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

    // Get user data from database for credits info
    const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    
    // Create response with user data
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
    
    // Create response and manually set the Supabase auth cookies
    const response = NextResponse.json(responseData);
    
    // Get the auth cookies that Supabase would set
    const { data: { session: refreshedSession } } = await supabase.auth.getSession();
    
    if (refreshedSession) {
      // Supabase stores auth tokens in cookies with specific names
      // We need to ensure these are properly set in the response
      cookieStore.getAll().forEach(cookie => {
        if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
          response.cookies.set({
            name: cookie.name,
            value: cookie.value,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 days
          });
        }
      });
    }
    
    return response;
  } catch (error) {
    console.error('LOGIN_ERROR', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Error'
    }, { status: 500 });
  }
}