import { NextResponse } from 'next/server';
import { createRouteHandlerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import Replicate from 'replicate';
import prisma from '@/lib/prisma';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Ensure REPLICATE_API_TOKEN is set
if (!process.env.REPLICATE_API_TOKEN) {
  console.warn("REPLICATE_API_TOKEN is not set. Video generation will fail.");
}

const REPLICATE_MODEL_VERSION = "wavespeedai/wan-2.1-i2v-480p";

export async function POST(request: Request) {
  // Initialize Supabase client with awaited cookies and headers
  const cookieStore = await cookies();
  const headerStore = await headers();
  const supabase = createRouteHandlerSupabaseClient({
    cookies: () => cookieStore,
    headers: () => headerStore,
  });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Parse request body; optional duration in seconds
    const body = await request.json();
    const { imageUrl, prompt } = body;

    if (!imageUrl || !prompt) {
      return new NextResponse('Missing imageUrl or prompt', { status: 400 });
    }

    // Check credits and create video record in a transaction
    const videoRecord = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < 3) {
        throw new Error('Insufficient credits');
      }

      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: 3 } },
      });

      // Create initial video record
      const newVideo = await tx.video.create({
        data: {
          userId: userId,
          imageUrl: imageUrl,
          prompt: prompt,
          status: 'processing',
        },
      });
      
      return newVideo;
    });

    // Attempt primary video generation via external API (support multiple env var names)
    const PRIMARY_API_URL = process.env.VIDEO_API_URL ?? process.env.PRIMARY_API_URL;
    const PRIMARY_API_TOKEN = process.env.VIDEO_API_TOKEN ?? process.env.PRIMARY_API_TOKEN;
    console.log('Primary API config:', { url: PRIMARY_API_URL, hasToken: Boolean(PRIMARY_API_TOKEN) });
    let jobId: string | null = null;
    if (PRIMARY_API_URL && PRIMARY_API_TOKEN) {
      try {
        // Fetch the input image
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error(`Failed to fetch input image: ${imgRes.statusText}`);
        const imgBuffer = await imgRes.arrayBuffer();
        // Prepare form data
        const form = new FormData();
        form.append('prompt', prompt);
        // Use provided duration or default to 5 seconds
        // form.append('duration', String(duration ?? 5));
        form.append('image', new Blob([imgBuffer], { type: imgRes.headers.get('content-type') || 'application/octet-stream' }), 'input.png');
        // Call external generate endpoint
        const genRes = await fetch(`${PRIMARY_API_URL.replace(/\/+$/, '')}/generate`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` },
          body: form,
        });
        if (!genRes.ok) throw new Error(`Primary API generate failed: ${genRes.statusText}`);
        const genData = await genRes.json();
        if (!genData.job_id) throw new Error('No job_id returned from primary API');
        jobId = genData.job_id;
      } catch (err) {
        console.error('Primary video generation API error:', err);
      }
    }
    // If primary API succeeded, record its job ID and return
    if (jobId) {
      await prisma.video.update({
        where: { id: videoRecord.id },
        data: { replicatePredictionId: jobId },
      });
      return NextResponse.json({
        message: 'Video generation initiated',
        videoId: videoRecord.id,
      }, { status: 202 });
    }
    // Fallback to Replicate API
    // Start an asynchronous prediction
    const prediction = await replicate.predictions.create({
      model: REPLICATE_MODEL_VERSION,
      input: { image: imageUrl, prompt: prompt },
    });
    if (!prediction?.id) {
      throw new Error("Failed to create Replicate prediction.");
    }
    // Update video record with the prediction ID
    await prisma.video.update({
      where: { id: videoRecord.id },
      data: { replicatePredictionId: prediction.id },
    });
    // Return the videoId for polling
    return NextResponse.json({
      message: 'Video generation initiated',
      videoId: videoRecord.id,
    }, { status: 202 });

  } catch (error) {
    console.error("ERROR_INITIATING_VIDEO_GENERATION", error);
    
    let errorMessage = 'Video generation failed';
    if (error instanceof Error) {
      if (error.message === 'Insufficient credits') {
        return new NextResponse(error.message, { status: 402 }); // Payment Required
      }
      errorMessage = error.message;
    }
    return new NextResponse(errorMessage, { status: 500 });
  }
} 