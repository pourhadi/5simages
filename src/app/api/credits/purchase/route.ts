import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { packageId, credits, amount } = body;
    
    if (!packageId || !credits || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // In a real implementation, you would:
    // 1. Create a payment intent with Stripe
    // 2. Return the client secret for the frontend to complete payment
    // 3. Handle webhook from Stripe to confirm payment and add credits
    
    // For demo purposes, we'll just add credits directly to the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update user's credits
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        credits: (user.credits || 0) + credits
      }
    });
    
    // Return success response with updated user info
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        credits: updatedUser.credits
      }
    });
    
  } catch (error) {
    console.error('Error processing credit purchase:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
} 