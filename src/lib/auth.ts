import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  credits: number;
  isAdmin: boolean;
}

/**
 * Get the authenticated user from the request
 * Returns null if not authenticated
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getAuthUser(_request?: NextRequest): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    
    // Create Supabase client
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
              // Ignore cookie setting errors in server components
            }
          },
        },
      }
    );

    // Get session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.user) {
      return null;
    }

    // Get user data from our database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        credits: true,
        isAdmin: true,
      },
    });

    if (!dbUser) {
      // User exists in Supabase but not in our database
      // This shouldn't happen in normal flow, but handle it gracefully
      console.error('User exists in Supabase but not in database:', session.user.id);
      return null;
    }

    // Ensure email is not null (it shouldn't be for authenticated users)
    if (!dbUser.email) {
      console.error('User has no email:', dbUser.id);
      return null;
    }

    return {
      ...dbUser,
      email: dbUser.email,
      name: dbUser.name || undefined,
      image: dbUser.image || undefined,
      isAdmin: dbUser.isAdmin || false,
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Require authentication for an API route
 * Returns the authenticated user or sends a 401 response
 */
export async function requireAuth(request?: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  return user;
}

/**
 * Require admin authentication for an API route
 * Returns the authenticated admin user or sends a 401/403 response
 */
export async function requireAdmin(request?: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  if (!user.isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }
  
  return user;
}

/**
 * Check if a user has enough credits for an operation
 */
export async function checkCredits(userId: string, requiredCredits: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  
  return user ? user.credits >= requiredCredits : false;
}

/**
 * Deduct credits from a user
 */
export async function deductCredits(userId: string, credits: number): Promise<boolean> {
  try {
    const result = await prisma.user.update({
      where: { id: userId },
      data: { 
        credits: {
          decrement: credits
        }
      },
    });
    
    return result.credits >= 0;
  } catch (error) {
    console.error('Error deducting credits:', error);
    return false;
  }
}

/**
 * Add credits to a user
 */
export async function addCredits(userId: string, credits: number): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { 
        credits: {
          increment: credits
        }
      },
    });
    
    return true;
  } catch (error) {
    console.error('Error adding credits:', error);
    return false;
  }
}