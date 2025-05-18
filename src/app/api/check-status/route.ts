import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createRouteHandlerSupabaseClient({
    cookies: () => cookieStore,
    headers: () => headerStore,
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return new NextResponse('Missing videoId', { status: 400 });
  }

  try {
    const video = await prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return new NextResponse('Video not found', { status: 404 });
    }
    if (video.userId !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error('Error in check-status:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Error checking status',
      { status: 500 }
    );
  }
}
