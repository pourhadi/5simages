import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import Replicate from 'replicate';

import prisma from '@/lib/prisma';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { randomUUID } from 'crypto';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Supabase buckets (videos bucket unused in this handler)
const GIFS_BUCKET = process.env.SUPABASE_GIFS_BUCKET_NAME || 'gifs';
export async function GET(request: Request) {
  // Initialize Supabase client for this route: await cookies() and headers() to avoid sync dynamic API usage
  // Properly await cookies and headers to avoid sync dynamic API usage
  const cookiesStore = await cookies();
  const headersStore = await headers();
  const supabase = createRouteHandlerSupabaseClient({
    cookies: () => cookiesStore,
    headers: () => headersStore,
  });
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

    // Return the current video status and fields
    return NextResponse.json(video);
      
      if (!outputUrl || (typeof outputUrl !== 'string' && !Array.isArray(outputUrl))) {
        // Mark as failed if no output URL
        await prisma.video.update({
          where: { id: videoId },
          data: { status: 'failed' },
        });
        // Refund credits on failure
        try {
          const refundAmount = video.type === 'slow' ? 1 : 2;
          await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: refundAmount } },
          });
        } catch (refundError) {
          console.error("ERROR_REFUNDING_CREDITS", refundError);
        }
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
        // Refund credits on failure
        try {
          const refundAmount = video.type === 'slow' ? 1 : 2;
          await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: refundAmount } },
          });
        } catch (refundError) {
          console.error("ERROR_REFUNDING_CREDITS", refundError);
        }
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

        // Upload video to external GIF conversion service
        const supabaseAdmin = getSupabaseAdmin();
        const apiKey = 'dabf5af2d8d1138dee335941f670a1c2a6218cd2197b95f2178d8d21247e8bc6';
        // Create GIF conversion job
        const formData = new FormData();
        formData.append('fps', '16');
        formData.append('file', new Blob([videoData], { type: 'video/mp4' }), 'video.mp4');
        const createJobResponse = await fetch(
          'https://video2gif-580559758743.us-central1.run.app/jobs',
          {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey },
            body: formData,
          }
        );
        if (!createJobResponse.ok) {
          throw new Error(`Failed to create GIF job: ${createJobResponse.statusText}`);
        }
        const { job_id: jobId } = await createJobResponse.json();
        // Poll for job status
        let jobStatus = '';
        do {
          await new Promise((res) => setTimeout(res, 2000));
          const statusResponse = await fetch(
            `https://video2gif-580559758743.us-central1.run.app/jobs/${jobId}`,
            { headers: { 'X-API-KEY': apiKey } }
          );
          if (!statusResponse.ok) {
            throw new Error(`Failed to get job status: ${statusResponse.statusText}`);
          }
          const statusJson = await statusResponse.json();
          jobStatus = statusJson.status;
          if (jobStatus === 'failed') {
            throw new Error('GIF conversion failed');
          }
        } while (jobStatus !== 'finished');
        // Download the generated GIF
        const gifResponse = await fetch(
          `https://video2gif-580559758743.us-central1.run.app/jobs/${jobId}/gif`,
          { headers: { 'X-API-KEY': apiKey } }
        );
        if (!gifResponse.ok) {
          throw new Error(`Failed to download GIF: ${gifResponse.statusText}`);
        }
        const gifArrayBuffer = await gifResponse.arrayBuffer();
        const gifBuffer = Buffer.from(gifArrayBuffer);
        // Upload GIF to Supabase
        const gifFileName = `${video.userId}/${randomUUID()}.gif`;
        const { error: gifsError } = await supabaseAdmin.storage
          .from(GIFS_BUCKET)
          .upload(gifFileName, gifBuffer, { contentType: 'image/gif' });
        if (gifsError) {
          throw new Error(`Supabase GIF upload error: ${gifsError.message}`);
        }
        const { data: gifUrlData } = await supabaseAdmin.storage
          .from(GIFS_BUCKET)
          .getPublicUrl(gifFileName);
        if (!gifUrlData?.publicUrl) {
          throw new Error('Could not get GIF public URL');
        }
        // Update video record with videoUrl and gifUrl
        const updatedVideo = await prisma.video.update({
          where: { id: videoId },
          data: {
            status: 'completed',
            videoUrl: videoUrl,
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
        // Refund credits on failure
        try {
          const refundAmount = video.type === 'slow' ? 1 : 2;
          await prisma.user.update({
            where: { id: userId },
            data: { credits: { increment: refundAmount } },
          });
        } catch (refundError) {
          console.error("ERROR_REFUNDING_CREDITS", refundError);
        }
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
      // Refund credits on failure
      try {
        const refundAmount = video.type === 'slow' ? 1 : 2;
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: refundAmount } },
        });
      } catch (refundError) {
        console.error("ERROR_REFUNDING_CREDITS", refundError);
      }
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