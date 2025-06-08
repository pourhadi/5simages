import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    try {
      const cookieStore = await cookies();
      const headerStore = await headers();
      const supabase = createRouteHandlerSupabaseClient({ 
        cookies: () => cookieStore,
        headers: () => headerStore
      });
      
      // Exchange code for session
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('OAuth callback error:', error);
        return NextResponse.redirect(new URL('/login?error=oauth_error', request.url));
      }

      if (session?.user) {
        // Check if user exists in our database
        let user = await prisma.user.findUnique({
          where: { email: session.user.email! },
        });

        if (!user) {
          // Create new user with Google account
          user = await prisma.user.create({
            data: {
              email: session.user.email!,
              name: session.user.user_metadata?.full_name || session.user.email!.split('@')[0],
              hashedPassword: null, // No password for OAuth users
              emailVerified: new Date(), // Google accounts are pre-verified
              image: session.user.user_metadata?.avatar_url,
              credits: 5, // Welcome bonus
            },
          });
        } else if (!user.emailVerified) {
          // If user exists but email not verified, verify it now (they've authenticated with Google)
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              emailVerified: new Date(),
              image: user.image || session.user.user_metadata?.avatar_url,
            },
          });
        }

        // The Supabase middleware will handle setting the session cookies
        // Just redirect to the destination
        return NextResponse.redirect(new URL(next, request.url));
      }

      // No session created
      return NextResponse.redirect(new URL('/login?error=oauth_error', request.url));
    } catch (error) {
      console.error('OAuth callback processing error:', error);
      return NextResponse.redirect(new URL('/login?error=oauth_error', request.url));
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}