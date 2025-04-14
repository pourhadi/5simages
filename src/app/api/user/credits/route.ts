import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

/**
 * API endpoint to retrieve the current user's credits directly from the database
 * Useful for debugging and ensuring accurate credit balances
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Fetch the user from the database to get the accurate credit count
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        email: true,
        credits: true 
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return the database credit count and session credit count for comparison
    return NextResponse.json({
      sessionCredits: session.user.credits,
      databaseCredits: user.credits,
      inSync: session.user.credits === user.credits,
      userId: user.id,
      email: user.email
    });
    
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user credits' },
      { status: 500 }
    );
  }
} 