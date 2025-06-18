import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import { processPaymentSession } from '@/lib/stripe';
import { db } from '@/lib/supabaseDb';

export async function GET(request: Request) {
  try {
    // Initialize Supabase client with the incoming request’s cookies and headers
    const cookieStore = cookies();
    const headerStore = headers();
    const supabase = createRouteHandlerSupabaseClient({
      cookies: () => cookieStore,
      headers: () => headerStore,
    });
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user?.id) {
      return NextResponse.json(
        { error: 'You must be signed in to verify payments' },
        { status: 401 }
      );
    }
    const userId = user.id;
    
    // Get the session ID from the URL
    const { searchParams } = new URL(request.url);
    const stripeSessionId = searchParams.get('session_id');
    
    if (!stripeSessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    // Process the payment session
    const result = await processPaymentSession(stripeSessionId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to verify payment' },
        { status: 400 }
      );
    }
    
    // Ensure the payment is for the authenticated user
    if (result.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized payment verification' },
        { status: 403 }
      );
    }
    
    // Get current user credits from Supabase
    const dbUser = await db.users.findById(userId);
    
    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    const creditAmount = result.credits || 0;
    
    // Add purchased credits to user's account (fallback if webhook did not run)
    // Compute new balance
    const oldBalance = dbUser.credits || 0;
    const newBalance = oldBalance + creditAmount;
    if (creditAmount > 0) {
      try {
        await db.users.update(userId, { credits: newBalance });
        console.log(
          `[Verify API] Added ${creditAmount} credits to user ${userId}. New balance: ${newBalance}`
        );
      } catch (updateError) {
        console.error(
          `[Verify API] Failed to update credits for user ${userId}:`, updateError
        );
        return NextResponse.json(
          { error: 'Failed to update user credits' },
          { status: 500 }
        );
      }
    }
    
    // Return success with credits information
    return NextResponse.json({
      success: true,
      credits: creditAmount,
      newBalance
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 