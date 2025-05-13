import { NextResponse } from 'next/server';
import { processPendingVideos } from '@/lib/videoProcessor';

export async function GET(request: Request) {
  // Protect this endpoint with a secret header
  const secret = request.headers.get('x-cron-secret');
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  try {
    await processPendingVideos();
    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Error in cron process-videos:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}