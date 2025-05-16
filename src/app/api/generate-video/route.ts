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
// Model version and prompt prefix for optional prompt enhancement via llava-13b
const LLAVA_ENHANCER_MODEL_VERSION = process.env.LLAVA_ENHANCER_MODEL_VERSION ?? "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb";
// Prefix to include before user instructions when asking llava-13b to enhance the prompt
const LLAVA_ENHANCER_PREFIX =
    `You are a video animation specialist who excels at enhancing prompts for Wan2.1's image-to-video generation. I'll show you an image that will be used as the starting point for video generation. Your task is to create a detailed prompt that will guide how this static image should be animated and developed into a fluid video sequence.

Please follow these guidelines:

1. First, briefly analyze what's present in the image to establish our starting point.

2. Create a prompt that focuses primarily on:
   - How elements should move and animate (specify natural movements for subjects)
   - Temporal progression (how the scene should develop over time)
   - Dynamic elements that should be added to bring the scene to life
   - Atmospheric changes or progressions (lighting, weather effects, etc.)
   - Camera movements that would enhance the scene (panning, zooming, etc.)

3. Structure your prompt to include:
   - Movement description for main subjects (how people, animals or objects should move)
   - Environmental dynamics (how background elements should behave)
   - Suggested camera behavior (steady, following action, revealing new elements)
   - Temporal sequence (beginning, middle, end of the animation)
   - Mood/atmosphere development

4. Keep the prompt between 80-100 words for optimal processing by Wan2.1.

5. Ensure the animation suggestions are physically plausible and maintain the integrity of the original image.

6. If the image contains text, describe how that text should animate or be presented dynamically.

7. Focus more on motion guidance than static visual descriptions, as the image already provides the visual foundation.

Provide only the enhanced prompt with no additional explanation or commentary.`;

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
  // Track credit cost and video record for potential refund on failure
  let cost = 0;
  let videoRecordId: string | undefined;

  try {
    // Parse request body; optional duration in seconds
    const body = await request.json();
    const { imageUrl, prompt, generationType = 'fast', enhancePrompt = false } = body;

    if (!imageUrl || !prompt) {
      return new NextResponse('Missing imageUrl or prompt', { status: 400 });
    }

    // Determine credit cost based on generation type
    cost = generationType === 'slow' ? 1 : 2;
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
    // Remember record ID for refund on error
    videoRecordId = videoRecord.id;
    // Prepare signedUrl placeholder (for prompt enhancement and generation)
    const signedUrl: string | null = null;

    // Prepare prompt: optionally enhance via llava-13b
    let effectivePrompt = prompt;
    if (enhancePrompt) {
      try {
        // Call llava-13b for prompt enhancement, wait up to 60s for output
        // Build the prompt for enhancement by including user instructions
        const llavaInputPrompt = `${LLAVA_ENHANCER_PREFIX} ${prompt}`;
        const llavaPrediction = await replicate.predictions.create({
          version: LLAVA_ENHANCER_MODEL_VERSION,
          input: {
            image: signedUrl ?? imageUrl,
            prompt: llavaInputPrompt,
          },
          wait: 60,
        });
        // Extract output text
        const llavaRaw = Array.isArray(llavaPrediction.output)
          ? llavaPrediction.output.join(' ')
          : llavaPrediction.output;
        const llavaOutput = (llavaRaw ?? '').toString().trim();
        if (llavaOutput) {
          effectivePrompt = `${llavaOutput} ${prompt}`;
        }
      } catch (enhanceError) {
        console.error('LLAVA_ENHANCEMENT_ERROR', enhanceError);
        // Fallback to original prompt on error
      }
    }
    // If prompt was enhanced, update the database record with the full prompt
    if (enhancePrompt && effectivePrompt !== prompt) {
      await prisma.video.update({
        where: { id: videoRecord.id },
        data: { prompt: effectivePrompt },
      });
    }

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
          prompt: effectivePrompt,
          duration: 4,
          aspect_ratio: "16:9",
          frame_image_url: signedUrl ?? imageUrl,
          use_prompt_enhancer: enhancePrompt,
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
        form.append('prompt', effectivePrompt);
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
      input: { image: signedUrl ?? imageUrl, prompt: effectivePrompt },
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
    // Refund credits if record was created and cost was deducted
    if (videoRecordId && cost > 0) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: cost } },
        });
        await prisma.video.update({
          where: { id: videoRecordId },
          data: { status: 'failed' },
        });
      } catch (refundError) {
        console.error("ERROR_REFUNDING_CREDITS", refundError);
      }
    }
    return new NextResponse(errorMessage, { status: 500 });
  }
} 