import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import prisma from '@/lib/prisma';

/**
 * API endpoint to retrieve the current user's credits directly from the database
 * Useful for debugging and ensuring accurate credit balances
 */
export async function GET() {
  try {
    // Initialize Supabase client using the new SSR approach
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        credits: true
      }
    });
    
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return the user's current credit count from the database
    return NextResponse.json({
      id: dbUser.id,
      email: dbUser.email,
      credits: dbUser.credits ?? 0
    });
    
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user credits' },
      { status: 500 }
    );
  }
} 