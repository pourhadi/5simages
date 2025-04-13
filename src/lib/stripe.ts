import Stripe from 'stripe';

// Initialize Stripe with API key from environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not defined. Stripe integration will not work.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Credit package options
export const CREDIT_PACKAGES = [
  { id: 'credits_5', name: '5 Credits', credits: 5, price: 499, currency: 'usd' }, // $4.99
  { id: 'credits_20', name: '20 Credits', credits: 20, price: 1499, currency: 'usd' }, // $14.99
  { id: 'credits_50', name: '50 Credits', credits: 50, price: 2999, currency: 'usd' }, // $29.99
];

/**
 * Create a Stripe checkout session for purchasing credits
 */
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  packageId: string
): Promise<{ url: string } | { error: string }> {
  try {
    // Find the selected credit package
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      return { error: 'Invalid package selected' };
    }

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: creditPackage.currency,
            product_data: {
              name: creditPackage.name,
              description: `${creditPackage.credits} credits for I2V app`,
            },
            unit_amount: creditPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/credits/cancel`,
      customer_email: userEmail,
      metadata: {
        userId,
        credits: creditPackage.credits.toString(),
        packageId: creditPackage.id,
      },
    });

    return { url: session.url || '' };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'An error occurred while creating the checkout session'
    };
  }
}

/**
 * Verify and process a completed Stripe session
 */
export async function processPaymentSession(sessionId: string): Promise<{ 
  success: boolean; 
  userId?: string; 
  credits?: number; 
  error?: string 
}> {
  try {
    // Retrieve the session to verify payment was successful
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return { 
        success: false, 
        error: 'Payment not completed' 
      };
    }

    // Extract metadata
    const userId = session.metadata?.userId;
    const creditsStr = session.metadata?.credits;

    if (!userId || !creditsStr) {
      return { 
        success: false, 
        error: 'Invalid session metadata' 
      };
    }

    const credits = parseInt(creditsStr, 10);
    if (isNaN(credits)) {
      return { 
        success: false, 
        error: 'Invalid credits value' 
      };
    }

    return { 
      success: true, 
      userId, 
      credits
    };
  } catch (error) {
    console.error('Error processing payment session:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process payment'
    };
  }
} 