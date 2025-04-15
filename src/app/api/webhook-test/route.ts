import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

// Simple endpoint to test webhook configuration and database connectivity
export async function GET() {
  try {
    // Check webhook secret
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    
    // Test database connection by getting a random user
    let dbConnection = false;
    let testUser = null;
    
    try {
      // Try to get the first user from the database to test connection
      const users = await db.users.findByEmail('test@example.com');
      dbConnection = true;
      testUser = users ? 'Found a test user' : 'No test user found, but connection works';
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      dbConnection = false;
    }
    
    return NextResponse.json({
      status: 'ok',
      webhookConfigured: hasWebhookSecret,
      dbConnection,
      testUser,
      supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      { error: 'Webhook test failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 