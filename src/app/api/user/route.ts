import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Initialize Supabase client with awaited cookies and headers
    const cookieStore = await cookies();
    const headerStore = await headers();
    const supabase = createRouteHandlerSupabaseClient({
      cookies: () => cookieStore,
      headers: () => headerStore,
    });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userEmail = session.user.email;
    
    // Fetch user from database including credit information
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        image: true,
        isAdmin: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Set default credits if null
    const userData = {
      ...user,
      credits: user.credits || 0,
      isAdmin: user.isAdmin ?? false
    };
    
    return NextResponse.json(userData);
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
} 