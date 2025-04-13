import { NextResponse } from 'next/server';
import { stripe, processPaymentSession } from '@/lib/stripe';
import prisma from '@/lib/prisma';

// Stripe webhook handler
export async function POST(request: Request) {
  try {
    // Get the request body as text
    const body = await request.text();
    
    // Get Stripe signature directly from request headers
    const signature = request.headers.get('stripe-signature') || '';
    
    // Verify Stripe webhook signature
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET is not defined');
      return new NextResponse('Webhook secret not configured', { status: 500 });
    }
    
    // Construct and verify the event
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new NextResponse('Webhook signature verification failed', { status: 400 });
    }
    
    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Process the completed payment
      const result = await processPaymentSession(session.id);
      
      if (!result.success) {
        console.error('Failed to process payment session:', result.error);
        return new NextResponse('Failed to process payment', { status: 400 });
      }
      
      // Add credits to the user's account
      if (result.userId && typeof result.credits === 'number') {
        try {
          // Get current user credits
          const user = await prisma.user.findUnique({
            where: { id: result.userId },
            select: { credits: true },
          });
          
          if (!user) {
            console.error('User not found:', result.userId);
            return new NextResponse('User not found', { status: 404 });
          }
          
          const creditAmount = result.credits; // Copy to a constant to satisfy TypeScript
          
          // Update user credits using a transaction to avoid race conditions
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: result.userId },
              data: {
                credits: user.credits + creditAmount,
              },
            });
          });
          
          console.log(`Added ${creditAmount} credits to user ${result.userId}`);
        } catch (dbError) {
          console.error('Database error while updating credits:', dbError);
          return new NextResponse('Database error', { status: 500 });
        }
      }
    }
    
    // Return success response
    return new NextResponse('Webhook received', { status: 200 });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Webhook error', { status: 500 });
  }
} 