import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const supabase = createRouteHandlerSupabaseClient({
      cookies: () => cookieStore,
      headers: () => headerStore,
    });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const requester = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true },
    });
    if (requester?.isAdmin !== true) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { email: true } } },
    });
    return NextResponse.json(videos);
  } catch (error) {
    console.error('ADMIN_VIDEOS_ERROR', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
