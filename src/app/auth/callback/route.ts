import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || requestUrl.searchParams.get('redirect') || '/';

  if (code) {
    try {
      // Create a Supabase server client for the route handler
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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            },
          },
        }
      );
      
      // Exchange code for session
      const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('OAuth callback error:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          status: error.status,
        });
        return NextResponse.redirect(new URL(`/login?error=oauth_error&message=${encodeURIComponent(error.message || 'Authentication failed')}`, request.url));
      }

      if (session?.user) {
        // Check if user exists in our database by Supabase auth ID first, then by email
        let user = await prisma.user.findUnique({
          where: { id: session.user.id },
        });

        if (!user) {
          // Check by email as fallback
          user = await prisma.user.findUnique({
            where: { email: session.user.email! },
          });

          if (!user) {
            // Create new user with Google account
            user = await prisma.user.create({
              data: {
                id: session.user.id, // Use Supabase auth ID
                email: session.user.email!,
                name: session.user.user_metadata?.full_name || 
                      session.user.user_metadata?.name || 
                      session.user.email!.split('@')[0],
                hashedPassword: null, // No password for OAuth users
                emailVerified: new Date(), // Google accounts are pre-verified
                image: session.user.user_metadata?.avatar_url || 
                       session.user.user_metadata?.picture,
                credits: 5, // Welcome bonus
              },
            });
          } else {
            // User exists with email but different ID, update the ID to match Supabase
            await prisma.user.update({
              where: { email: session.user.email! },
              data: { 
                id: session.user.id,
                emailVerified: user.emailVerified || new Date(),
                image: user.image || 
                       session.user.user_metadata?.avatar_url || 
                       session.user.user_metadata?.picture,
                name: user.name || 
                      session.user.user_metadata?.full_name || 
                      session.user.user_metadata?.name,
              },
            });
          }
        } else if (!user.emailVerified) {
          // If user exists but email not verified, verify it now (they've authenticated with Google)
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              emailVerified: new Date(),
              image: user.image || 
                     session.user.user_metadata?.avatar_url || 
                     session.user.user_metadata?.picture,
              name: user.name || 
                    session.user.user_metadata?.full_name || 
                    session.user.user_metadata?.name,
            },
          });
        }

        // The session has been established and cookies are set by the server client
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