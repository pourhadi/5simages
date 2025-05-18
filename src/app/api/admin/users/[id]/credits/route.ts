import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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
    select: { isAdmin: true },
  });
  if (!requester?.isAdmin) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { credits } = await request.json();
  const userId = params.id;
  if (typeof credits !== 'number' || credits < 0) {
    return new NextResponse('Invalid credits', { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits },
      select: { id: true, credits: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('UPDATE_CREDITS_ERROR', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
