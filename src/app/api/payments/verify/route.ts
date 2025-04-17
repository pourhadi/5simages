import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import { processPaymentSession } from '@/lib/stripe';
import { db } from '@/lib/supabaseDb';

export async function GET(request: Request) {
  try {
    // Get authenticated session
    const supabase = createRouteHandlerSupabaseClient({ cookies, headers });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be signed in to verify payments' },
        { status: 401 }
      );
    }
    const userId = session.user.id;
    
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
    const user = await db.users.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    const creditAmount = result.credits || 0;
    
    // Don't add credits here as they are already added by the webhook handler
    // Just return the current balance and the amount that was purchased
    console.log(`[Verify API] Verified payment for ${creditAmount} credits for user ${userId}. Current balance: ${user.credits || 0}`);
    
    // Return success with credits information
    return NextResponse.json({
      success: true,
      credits: creditAmount,
      newBalance: user.credits || 0
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 