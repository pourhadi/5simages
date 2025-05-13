import { NextResponse } from 'next/server';
import { processSingleVideo } from '@/lib/videoProcessor';

export const config = {
  runtime: 'nodejs',
};

export async function POST(
  request: Request,
  { params }: { params: { videoId: string } }
) {
  // Protect with secret header
  const secret = request.headers.get('x-process-secret');
  if (!secret || secret !== process.env.PROCESS_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { videoId } = params;
  try {
    await processSingleVideo(videoId);
    return NextResponse.json({ status: 'processing' });
  } catch (err) {
    console.error('Error in process-video:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}