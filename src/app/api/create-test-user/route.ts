import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

/**
 * Create a test user with confirmed email for testing purposes
 * DELETE THIS IN PRODUCTION
 */
export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not allowed in production', { status: 403 });
  }

  try {
    const testEmail = 'test@example.com';
    const testPassword = 'testpass123';
    const testName = 'Test User';

    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (existingUser) {
      return NextResponse.json({ 
        message: 'Test user already exists',
        email: testEmail,
        password: testPassword 
      });
    }

    // Create user with auto-confirmed email using admin client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: testName
      }
    });

    if (error) {
      console.error('Supabase create user error:', error);
      return new NextResponse(error.message, { status: 400 });
    }

    // Create user record in our database
    if (data.user) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: testEmail,
          name: testName,
          credits: 5,
          isAdmin: false
        }
      });
    }

    return NextResponse.json({ 
      message: 'Test user created successfully',
      email: testEmail,
      password: testPassword 
    });

  } catch (error) {
    console.error('Create test user error:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal Error',
      { status: 500 }
    );
  }
}