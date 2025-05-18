import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createRouteHandlerSupabaseClient({
    cookies: () => cookieStore,
    headers: () => headerStore,
  });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const requester = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true }
  });
  if (!requester?.isAdmin) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, credits: true, isAdmin: true },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json(users);
}
