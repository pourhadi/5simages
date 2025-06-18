import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
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
  // Initialize Supabase client using the new SSR approach
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  if (authError || !user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const userId = user.id;

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
    
    // Attempt primary API status check
    const PRIMARY_API_URL = process.env.VIDEO_API_URL;
    const PRIMARY_API_TOKEN = process.env.VIDEO_API_TOKEN;
    // Only use primary API for standard generation; premium uses Replicate only
    if (video.type === 'standard' && PRIMARY_API_URL && PRIMARY_API_TOKEN) {
      try {
        // Call primary API status endpoint
        const statusRes = await fetch(
          `${PRIMARY_API_URL.replace(/\/+$/, '')}/status/${video.replicatePredictionId}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` },
          }
        );
        if (!statusRes.ok) throw new Error(`Primary API status failed: ${statusRes.statusText}`);
        const statusData = await statusRes.json();
        const status = statusData.status;
        if (status === 'done') {
          // Construct the public/download URL for the generated video
          const downloadUrl = `${PRIMARY_API_URL.replace(/\/+$/, '')}/download/${video.replicatePredictionId}`;
          // Download video from primary API
          const downloadRes = await fetch(downloadUrl, {
            method: 'GET',
            headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` },
          });
          if (!downloadRes.ok) throw new Error(`Primary API download failed: ${downloadRes.statusText}`);
          const videoData = await downloadRes.arrayBuffer();
          // Upload video to external GIF conversion service
          const supabaseAdmin = getSupabaseAdmin();
          const apiKey = process.env.VIDEO2GIF_WEBHOOK_API_KEY || process.env.GIF_CONVERTER_API_KEY;
        if (!apiKey) {
          console.error('GIF converter API key not configured. Please set VIDEO2GIF_WEBHOOK_API_KEY or GIF_CONVERTER_API_KEY environment variable.');
          throw new Error('GIF conversion service not configured');
        }
          const formData = new FormData();
          formData.append('fps', '16');
          formData.append(
            'file',
            new Blob([videoData], { type: 'video/mp4' }),
            'video.mp4'
          );
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
          // Poll for GIF conversion job status
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
              videoUrl: downloadUrl,
              gifUrl: gifUrlData.publicUrl,
            },
          });
          return NextResponse.json(updatedVideo);
        } else if (status === 'failed') {
          const updatedVideo = await prisma.video.update({
            where: { id: videoId },
            data: { status: 'failed' },
          });
          // Refund credits on failure
          try {
            // Use type assertion since we're in a narrowed scope
            const videoType = video.type as string;
            const refundAmount = videoType === 'premium' ? 3 : videoType === 'slow' ? 1 : 2;
            await prisma.user.update({
              where: { id: userId },
              data: { credits: { increment: refundAmount } },
            });
          } catch (refundError) {
            console.error("ERROR_REFUNDING_CREDITS", refundError);
          }
          return NextResponse.json(updatedVideo);
        } else {
          return NextResponse.json(video);
        }
      } catch (error) {
        console.error('Primary API status error:', error);
        // Fallback to Replicate
      }
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
        // Refund credits on failure
        try {
          const refundAmount = video.type === 'premium' ? 3 : video.type === 'slow' ? 1 : 2;
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
          const refundAmount = video.type === 'premium' ? 3 : video.type === 'slow' ? 1 : 2;
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
        const apiKey = process.env.VIDEO2GIF_WEBHOOK_API_KEY || process.env.GIF_CONVERTER_API_KEY;
        if (!apiKey) {
          console.error('GIF converter API key not configured. Please set VIDEO2GIF_WEBHOOK_API_KEY or GIF_CONVERTER_API_KEY environment variable.');
          throw new Error('GIF conversion service not configured');
        }
        // Create GIF conversion job
        const formData = new FormData();
        formData.append('fps', '16');
        formData.append('file', new Blob([videoData], { type: 'video/mp4' }), 'video.mp4');
        console.log('Creating GIF conversion job with API key:', apiKey ? 'Present' : 'Missing');
        const createJobResponse = await fetch(
          'https://video2gif-580559758743.us-central1.run.app/jobs',
          {
            method: 'POST',
            headers: { 'X-API-KEY': apiKey },
            body: formData,
          }
        );
        if (!createJobResponse.ok) {
          const errorText = await createJobResponse.text();
          console.error('GIF conversion API error:', {
            status: createJobResponse.status,
            statusText: createJobResponse.statusText,
            body: errorText,
          });
          throw new Error(`Failed to create GIF job: ${createJobResponse.statusText} - ${errorText}`);
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
          const refundAmount = video.type === 'premium' ? 3 : video.type === 'slow' ? 1 : 2;
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
        const refundAmount = video.type === 'premium' ? 3 : video.type === 'slow' ? 1 : 2;
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