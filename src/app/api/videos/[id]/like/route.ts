import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;

    // Get the video ID from params
    const { id: videoId } = await params;

    // Check if the video exists and belongs to the user
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { userId: true, isLiked: true }
    });

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (video.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Toggle the like status
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: { isLiked: !video.isLiked },
      select: { id: true, isLiked: true }
    });

    return NextResponse.json({
      success: true,
      video: updatedVideo
    });

  } catch (error) {
    console.error('Error toggling like status:', error);
    return NextResponse.json(
      { error: 'Failed to update like status' },
      { status: 500 }
    );
  }
}