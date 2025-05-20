import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient({ req, res });
  // This will refresh auth tokens if they've expired - ensuring the user
  // session stays valid across navigation.
  await supabase.auth.getSession();
  return res;
}

// Apply to all paths except Next.js internals and public files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
