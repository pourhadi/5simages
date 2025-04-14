import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Get the user from the database to compare credits
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, credits: true }
    });
    
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      session: {
        id: session.user.id,
        email: session.user.email,
        credits: session.user.credits || 0,
        sessionExpires: session.expires,
      },
      database: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        credits: dbUser.credits || 0,
      } : null,
      syncStatus: {
        isInSync: dbUser ? (session.user.credits || 0) === (dbUser.credits || 0) : false,
        creditDiff: dbUser ? ((session.user.credits || 0) - (dbUser.credits || 0)) : null
      }
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