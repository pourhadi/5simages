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
// Model version for Slow and Good generation via Replicate
const SLOW_REPLICATE_MODEL_VERSION = process.env.SLOW_REPLICATE_MODEL_VERSION ?? "haiper-ai/haiper-video-2";

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
    const { imageUrl, prompt, generationType = 'fast' } = body;

    if (!imageUrl || !prompt) {
      return new NextResponse('Missing imageUrl or prompt', { status: 400 });
    }

    // Determine credit cost based on generation type
    const cost = generationType === 'slow' ? 1 : 3;
    // Check credits and create video record in a transaction
    const videoRecord = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < cost) {
        throw new Error('Insufficient credits');
      }

      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: cost } },
      });

      // Create initial video record
      const newVideo = await tx.video.create({
        data: {
          userId: userId,
          imageUrl: imageUrl,
          prompt: prompt,
          status: 'processing',
          type: generationType,
        },
      });
      
      return newVideo;
    });

    // const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    // const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`;
    const signedUrl: string | null = null;
    // if (imageUrl.startsWith(storagePrefix)) {
    //   // Use admin client to create a signed URL for private buckets
    //   const supabaseAdmin = getSupabaseAdmin();
    //   const rest = imageUrl.substring(storagePrefix.length);
    //   const slashIndex = rest.indexOf('/');
    //   if (slashIndex < 0) throw new Error(`Invalid Supabase storage URL: ${imageUrl}`);
    //   const bucket = rest.substring(0, slashIndex);
    //   const path = rest.substring(slashIndex + 1);
    //   const { data: signedData, error: signedError } =
    //     await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
    //   if (signedError || !signedData?.signedUrl) {
    //     throw new Error(`Failed to create signed URL: ${signedError?.message}`);
    //   }
    //   signedUrl = signedData.signedUrl;
    // }

    // If using Slow and Good option, skip primary API and use slow Replicate model
    if (generationType === 'slow') {
      // Start an asynchronous prediction with the slow model
      const prediction = await replicate.predictions.create({
        version: SLOW_REPLICATE_MODEL_VERSION,
        input: {
          prompt: prompt,
          duration: 4,
          aspect_ratio: "16:9",
          frame_image_url: signedUrl ?? imageUrl,
          use_prompt_enhancer: true,
        },
      });
      if (!prediction?.id) {
        throw new Error("Failed to create Replicate prediction.");
      }
      // Update video record with the prediction ID
      await prisma.video.update({
        where: { id: videoRecord.id },
        data: { replicatePredictionId: prediction.id },
      });
      return NextResponse.json({
        message: 'Video generation initiated',
        videoId: videoRecord.id,
      }, { status: 202 });
    }
    // Attempt primary video generation via external API (support multiple env var names)
    const PRIMARY_API_URL = process.env.VIDEO_API_URL ?? process.env.PRIMARY_API_URL;
    const PRIMARY_API_TOKEN = process.env.VIDEO_API_TOKEN ?? process.env.PRIMARY_API_TOKEN;
    console.log('Primary API config:', { url: PRIMARY_API_URL, hasToken: Boolean(PRIMARY_API_TOKEN) });
    let jobId: string | null = null;
    if (PRIMARY_API_URL && PRIMARY_API_TOKEN) {
      try {
        // Fetch the input image, supporting Supabase storage URLs via signed URL
        let imgBuffer: ArrayBuffer;
        let contentType = 'application/octet-stream';
        if (signedUrl != null) {
          // Use admin client to create a signed URL for private buckets
          const signedRes = await fetch(signedUrl);
          if (!signedRes.ok) throw new Error(`Failed to fetch input image: ${signedRes.statusText}`);
          contentType = signedRes.headers.get('content-type') || contentType;
          imgBuffer = await signedRes.arrayBuffer();
        } else {
          // Regular URL fetch
          const imgRes = await fetch(imageUrl);
          if (!imgRes.ok) throw new Error(`Failed to fetch input image: ${imgRes.statusText}`);
          contentType = imgRes.headers.get('content-type') || contentType;
          imgBuffer = await imgRes.arrayBuffer();
        }
        // Prepare form data
        const form = new FormData();
        form.append('prompt', prompt);
        // Use provided duration or default to 5 seconds
        // form.append('duration', String(duration ?? 5));
        form.append('image', new Blob([imgBuffer], { type: contentType }), 'input.png');
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
    // Use version field for Replicate API (required by HTTP API)
    const prediction = await replicate.predictions.create({
      version: REPLICATE_MODEL_VERSION,
      input: { image: signedUrl ?? imageUrl, prompt: prompt },
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