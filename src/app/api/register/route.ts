import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
// import prisma from '@/lib/prisma'; // Database record will be created after email confirmation on first login

/**
 * Register a new user: sign up in Supabase Auth, then mirror in Prisma.
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
    const { email, name, password } = await request.json();
    if (!email || !name || !password) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    // Create user in Supabase Auth, send confirmation email with redirect
    // Redirect URL for email confirmation page
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const emailRedirectTo = siteUrl ? `${siteUrl.replace(/\/+$/, '')}/confirm` : undefined;
    const { data, error: signUpError } = await supabase.auth.signUp(
      {
        email,
        password,
        options: {
          data: { name },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      }
    );
    if (signUpError) {
      return new NextResponse(signUpError.message, { status: 400 });
    }
    const user = data.user;
    if (!user || !user.id) {
      return new NextResponse('Failed to sign up user', { status: 500 });
    }

    // Registration successful: an email confirmation has been sent
    return NextResponse.json(
      { message: 'Signup successful! Please check your email to confirm your account.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('REGISTRATION_ERROR', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Error',
      { status: 500 }
    );
  }
}