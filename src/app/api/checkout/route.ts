import { NextResponse, NextRequest } from 'next/server';
import { createCheckoutSession, CREDIT_PACKAGES } from '@/lib/stripe';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;
    const userId = user.id;
    const userEmail = user.email;
    
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