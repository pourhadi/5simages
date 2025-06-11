import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabaseServer';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);
  
  // This will refresh auth tokens if they've expired - ensuring the user
  // session stays valid across navigation.
  const { data: { session } } = await supabase.auth.getSession();
  
  return response;
}

// Apply to all paths except Next.js internals and public files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
