// This file has been deprecated. We now use the Stripe checkout flow.
// Please use /api/checkout and /api/webhook endpoints instead.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ 
    error: 'This endpoint is deprecated. Please use the Stripe checkout flow.' 
  }, { status: 410 });
} 