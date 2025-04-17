import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import Replicate from 'replicate';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
// Use ffmpeg-static to locate the ffmpeg binary path at runtime
import ffmpegPath from 'ffmpeg-static';
import prisma from '@/lib/prisma';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { randomUUID } from 'crypto';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Supabase buckets (videos bucket unused in this handler)
const GIFS_BUCKET = process.env.SUPABASE_GIFS_BUCKET_NAME || 'gifs';
// Configure fluent-ffmpeg to use the static ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

export async function GET(request: Request) {
  const supabase = createRouteHandlerSupabaseClient({ cookies, headers });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const userId = session.user.id;

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
    if (video.userId !== userId) {
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

        // Convert video to GIF (16 fps)
        const supabaseAdmin = getSupabaseAdmin();
        const tmpDir = os.tmpdir();
        const inputPath = path.join(tmpDir, `${randomUUID()}.mp4`);
        const outputPath = path.join(tmpDir, `${randomUUID()}.gif`);
        await fs.writeFile(inputPath, Buffer.from(videoData));
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .outputOptions(['-r 16'])
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
        });
        const gifData = await fs.readFile(outputPath);

        // Upload GIF to Supabase
        const gifFileName = `${video.userId}/${randomUUID()}.gif`;
        const { error: gifsError } = await supabaseAdmin.storage
          .from(GIFS_BUCKET)
          .upload(gifFileName, gifData, { contentType: 'image/gif' });
        if (gifsError) {
          throw new Error(`Supabase GIF upload error: ${gifsError.message}`);
        }
        const { data: gifUrlData } = await supabaseAdmin.storage
          .from(GIFS_BUCKET)
          .getPublicUrl(gifFileName);
        if (!gifUrlData?.publicUrl) {
          throw new Error('Could not get GIF public URL');
        }

        // Update with success status and GIF URL
        const updatedVideo = await prisma.video.update({
          where: { id: videoId },
          data: {
            status: 'completed',
            gifUrl: gifUrlData.publicUrl,
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