import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

/**
 * Diagnostic endpoint to check if session credits match database credits
 * Only available in development mode for security reasons
 */
export async function GET() {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get the user from the database to compare credits
    const userId = session.user.id;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, credits: true }
    });
    
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      session: {
        id: session.user.id,
        email: session.user.email,
        sessionExpires: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : session.expires_at,
      },
      database: dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            credits: dbUser.credits ?? 0,
          }
        : null,
    });
    
  } catch (error) {
    console.error('Session debug error:', error);
    return NextResponse.json({ 
      error: 'An error occurred', 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 