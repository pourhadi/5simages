import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { processPaymentSession } from '@/lib/stripe';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be signed in to verify payments' },
        { status: 401 }
      );
    }
    
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
    if (result.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized payment verification' },
        { status: 403 }
      );
    }
    
    // Get current user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    const creditAmount = result.credits || 0;
    const newTotal = user.credits + creditAmount;
    
    // Update the user's credits in the database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { credits: newTotal },
    });
    
    console.log(`[Verify API] Added ${creditAmount} credits to user ${session.user.id}. New balance: ${newTotal}`);
    
    // Return success with credits added
    return NextResponse.json({
      success: true,
      credits: creditAmount,
      newBalance: newTotal
    });
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 