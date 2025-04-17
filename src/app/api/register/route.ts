import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * Register a new user: sign up in Supabase Auth, then mirror in Prisma.
 */
export async function POST(request: Request) {
  const supabase = createRouteHandlerSupabaseClient({ cookies, headers });
  try {
    const { email, name, password } = await request.json();
    if (!email || !name || !password) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    // Create user in Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (signUpError) {
      return new NextResponse(signUpError.message, { status: 400 });
    }
    const user = data.user;
    if (!user || !user.id) {
      return new NextResponse('Failed to sign up user', { status: 500 });
    }

    // Mirror user in Prisma DB with same ID and initial credits
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name,
        credits: 5
      }
    });
    return NextResponse.json({ id: user.id, email: user.email, name, credits: 5 });
  } catch (error) {
    console.error('REGISTRATION_ERROR', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Error',
      { status: 500 }
    );
  }
}