import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import { createCheckoutSession, CREDIT_PACKAGES } from '@/lib/stripe';

export async function POST(request: Request) {
  try {
    // Get the authenticated user via Supabase
    const supabase = createRouteHandlerSupabaseClient({ cookies, headers });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: 'You must be signed in to purchase credits' },
        { status: 401 }
      );
    }
    const userId = session.user.id;
    const userEmail = session.user.email;
    
    // Get the requested package from the request
    const body = await request.json();
    const { packageId } = body;
    
    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }
    
    // Validate package ID
    const isValidPackage = CREDIT_PACKAGES.some(pkg => pkg.id === packageId);
    if (!isValidPackage) {
      return NextResponse.json(
        { error: 'Invalid package selected' },
        { status: 400 }
      );
    }
    
    // Create checkout session
    const checkoutResult = await createCheckoutSession(
      userId,
      userEmail,
      packageId
    );
    
    if ('error' in checkoutResult) {
      return NextResponse.json(
        { error: checkoutResult.error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ url: checkoutResult.url });
    
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
} 