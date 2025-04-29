import Stripe from 'stripe';

// Check if the Stripe secret key is available in the environment
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not defined. Stripe integration will not work.');
}

// Initialize Stripe with API key from environment variables and explicit API version
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'test_key_for_development_only', 
  {
    apiVersion: '2025-03-31.basil', // Using the latest API version
    appInfo: {
      name: 'i2v',
      version: '1.0.0',
    },
  }
);

// Credit package options
export const CREDIT_PACKAGES = [
  { id: 'credits_3', name: '3 Credits', credits: 3, price: 75, currency: 'usd' },
  { id: 'credits_15', name: '15 Credits', credits: 15, price: 375, currency: 'usd' },
  { id: 'credits_30', name: '30 Credits', credits: 30, price: 690, currency: 'usd' },
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
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return { error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.' };
    }

    // Find the selected credit package
    const creditPackage = CREDIT_PACKAGES.find(pkg => pkg.id === packageId);
    if (!creditPackage) {
      return { error: 'Invalid package selected' };
    }

    // Make sure APP_URL is configured
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.warn('NEXT_PUBLIC_APP_URL is not configured. Using fallback URL.');
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
      success_url: `${baseUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/credits/cancel`,
      customer_email: userEmail,
      metadata: {
        userId,
        credits: creditPackage.credits.toString(),
        packageId: creditPackage.id,
      },
    });

    if (!session.url) {
      return { error: 'Failed to create checkout session URL' };
    }

    return { url: session.url };
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
    // Check if Stripe is properly configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return { 
        success: false, 
        error: 'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.' 
      };
    }

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