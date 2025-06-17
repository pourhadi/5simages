import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabaseServer';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);
  
  // This will refresh auth tokens if they've expired - ensuring the user
  // session stays valid across navigation.
  const { data: { session }, error } = await supabase.auth.getSession();
  
  // Log authentication errors for debugging
  if (error) {
    console.error('Middleware auth error:', error);
  }
  
  // Protected routes that require authentication
  const protectedPaths = ['/admin', '/api/admin', '/api/generate-video', '/api/checkout'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  // Redirect to login if accessing protected route without session
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Add session info to request headers for API routes
  if (session?.user) {
    response.headers.set('x-user-id', session.user.id);
    response.headers.set('x-user-email', session.user.email || '');
  }
  
  return response;
}

// Apply to all paths except Next.js internals, public files, and auth endpoints
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|api/login|api/register|api/forgot-password).*)',
  ],
};
