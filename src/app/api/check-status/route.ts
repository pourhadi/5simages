import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import Replicate from 'replicate';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { randomUUID } from 'crypto';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

const VIDEOS_BUCKET = process.env.SUPABASE_VIDEOS_BUCKET_NAME || 'videos';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Get the videoId from the URL
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  
  if (!videoId) {
    return new NextResponse('Missing videoId', { status: 400 });
  }

  try {
    // Get the video record
    const video = await prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      return new NextResponse('Video not found', { status: 404 });
    }

    // Check ownership
    if (video.userId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // If the video is already completed or failed, just return it
    if (video.status === 'completed' || video.status === 'failed') {
      return NextResponse.json(video);
    }

    // If no prediction ID, we can't check status
    if (!video.replicatePredictionId) {
      return NextResponse.json({
        ...video,
        error: 'No prediction ID available'
      });
    }

    // Check prediction status
    const prediction = await replicate.predictions.get(video.replicatePredictionId);
    
    // Update the video record based on the prediction status
    if (prediction.status === 'succeeded') {
      // Get the output URL from the prediction
      const outputUrl = prediction.output;
      
      if (!outputUrl || (typeof outputUrl !== 'string' && !Array.isArray(outputUrl))) {
        // Mark as failed if no output URL
        await prisma.video.update({
          where: { id: videoId },
          data: { status: 'failed' },
        });
        return NextResponse.json({
          ...video,
          status: 'failed',
          error: 'No output URL from Replicate'
        });
      }

      // Handle either string or array output
      const videoUrl = typeof outputUrl === 'string' ? outputUrl : Array.isArray(outputUrl) ? outputUrl[0] : null;
      
      if (!videoUrl) {
        await prisma.video.update({
          where: { id: videoId },
          data: { status: 'failed' },
        });
        return NextResponse.json({
          ...video,
          status: 'failed',
          error: 'Invalid output format from Replicate'
        });
      }

      try {
        // Download video from Replicate
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download from ${videoUrl}: ${videoResponse.statusText}`);
        }
        
        const videoData = await videoResponse.arrayBuffer();
        
        // Upload to Supabase
        const supabaseAdmin = getSupabaseAdmin();
        const videoFileName = `${video.userId}/${randomUUID()}.mp4`;
        
        const { error: uploadError } = await supabaseAdmin.storage
          .from(VIDEOS_BUCKET)
          .upload(videoFileName, videoData, { contentType: 'video/mp4' });
          
        if (uploadError) {
          throw new Error(`Supabase upload error: ${uploadError.message}`);
        }
        
        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from(VIDEOS_BUCKET)
          .getPublicUrl(videoFileName);
          
        if (!urlData?.publicUrl) {
          throw new Error('Could not get public URL');
        }
        
        // Update with success status and Supabase URL
        const updatedVideo = await prisma.video.update({
          where: { id: videoId },
          data: { 
            status: 'completed',
            videoUrl: urlData.publicUrl
          },
        });
        
        return NextResponse.json(updatedVideo);
        
      } catch (error) {
        console.error('Error processing completed prediction:', error);
        await prisma.video.update({
          where: { id: videoId },
          data: { status: 'failed' },
        });
        return NextResponse.json({
          ...video,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error processing video'
        });
      }
    } else if (prediction.status === 'failed') {
      // Update to failed status
      const updatedVideo = await prisma.video.update({
        where: { id: videoId },
        data: { status: 'failed' },
      });
      return NextResponse.json(updatedVideo);
    } else {
      // Still processing
      return NextResponse.json(video);
    }
  } catch (error) {
    console.error('Error in check-status:', error);
    return new NextResponse(error instanceof Error ? error.message : 'Error checking status', { status: 500 });
  }
} 