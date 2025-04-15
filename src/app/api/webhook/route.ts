import { NextResponse } from 'next/server';
import { stripe, processPaymentSession } from '@/lib/stripe';
import { db } from '@/lib/supabaseDb';

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
      
      console.log('Processing completed checkout session:', session.id);
      
      // Process the completed payment
      const result = await processPaymentSession(session.id);
      
      if (!result.success) {
        console.error('Failed to process payment session:', result.error);
        return new NextResponse('Failed to process payment', { status: 400 });
      }
      
      // Add credits to the user's account
      if (result.userId && typeof result.credits === 'number') {
        try {
          // Get current user credits from Supabase
          const user = await db.users.findById(result.userId);
          
          if (!user) {
            console.error('User not found:', result.userId);
            return new NextResponse('User not found', { status: 404 });
          }
          
          const currentCredits = user.credits || 0;
          const creditAmount = result.credits;
          const newTotal = currentCredits + creditAmount;
          
          console.log(`Updating credits for user ${result.userId}: ${currentCredits} + ${creditAmount} = ${newTotal}`);
          
          // Update user credits in Supabase
          await db.users.update(result.userId, { 
            credits: newTotal,
          });
          
          console.log(`Successfully added ${creditAmount} credits to user ${result.userId}. New balance: ${newTotal}`);
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