import { NextResponse, NextRequest } from 'next/server';
import { headers } from 'next/headers';
import Replicate from 'replicate';
import prisma from '@/lib/prisma';
import { requireAuth, addCredits } from '@/lib/auth';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

// Ensure REPLICATE_API_TOKEN is set
if (!process.env.REPLICATE_API_TOKEN) {
  console.warn("REPLICATE_API_TOKEN is not set. Video generation will fail.");
}

// SeedDance-1-Pro model: ByteDance SeedDance-1-Pro ($0.03/second = $0.15 for 5s)
const SEEDANCE_REPLICATE_MODEL_VERSION = "bytedance/seedance-1-pro";
// Kling v1.6 Standard model: Kling v1.6 Standard ($0.25/video)
const KLING_REPLICATE_MODEL_VERSION = process.env.KLING_REPLICATE_MODEL_VERSION ?? "kwaivgi/kling-v1.6-standard:c1b16805f929c47270691c7158f1e892dcaf3344b8d19fcd7475e525853b8b2c";
// Wan 2.1 i2v 480p model: wan-2.1-i2v-480p ($0.45/video)
// Using wavespeedai's wan model implementation
const WAN_REPLICATE_MODEL_VERSION = "wavespeedai/wan-2.1-i2v-480p";
// Hailuo-02 model: minimax/hailuo-02 ($0.045/second = $0.45 for 10s)
const HAILUO_REPLICATE_MODEL_VERSION = "minimax/hailuo-02";
// Model version and prompt prefix for optional prompt enhancement via llava-13b
const LLAVA_ENHANCER_MODEL_VERSION = process.env.LLAVA_ENHANCER_MODEL_VERSION ?? "yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb";
// Prefix to include before user instructions when asking llava-13b to enhance the prompt
const LLAVA_ENHANCER_PREFIX =
    `You are a video prompt engineering expert specializing in enhancing user prompts for Wan2.1's image-to-video generation. You'll be shown a source image and given the user's original prompt describing their desired animation. Your task is to enhance their prompt to help Wan2.1 more accurately create the animation the user envisions.

Please follow these guidelines:

1. Analyze both the source image and the user's original prompt carefully.

2. Create an enhanced prompt that:
   - Preserves all key elements from the user's original request
   - Adds specific details about how elements in the image should move and animate
   - Describes temporal progression that aligns with the user's intent
   - Suggests appropriate camera movements
   - Specifies atmospheric changes that support the desired mood

3. Focus on translating the user's animation request into technically precise language that Wan2.1 can interpret effectively, while maintaining their creative vision.

4. Structure your enhanced prompt to include:
   - Clear movement descriptions for main elements visible in the image
   - Specific animation guidance that achieves what the user wants
   - Temporal flow (beginning, middle, end of animation)
   - Technical details that Wan2.1 needs but the user may have omitted

5. Keep the enhanced prompt between 80-100 words for optimal processing.

6. Remember that your goal is to help realize the user's vision for the animation, not to change it or impose your own creative direction.

7. If the user's prompt suggests animations that seem technically difficult given the source image, adapt the prompt to suggest the closest achievable alternative.

Provide only the enhanced prompt with no additional explanation. The user's prompt is the following: `;

export async function POST(request: NextRequest) {
  // Get authenticated user
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const user = authResult;
  const userId = user.id;
  // Track credit cost and video record for potential refund on failure
  let cost = 0;
  let videoRecordId: string | undefined;

  try {
    // Parse request body; optional duration in seconds
    const body = await request.json();
    const { imageUrl, prompt, generationType = 'standard', enhancePrompt = false, sampleSteps = 30, sampleGuideScale = 5 } = body;

    if (!imageUrl || !prompt) {
      return new NextResponse('Missing imageUrl or prompt', { status: 400 });
    }

    // Determine credit cost based on generation type
    // SeedDance-1-Pro: $0.15 = 1 credit (5s at $0.03/s)
    // Kling v1.6 Standard: $0.25 = 2 credits
    // Wan 2.1 i2v 480p: $0.45 = 3 credits
    // Hailuo-02: $0.45 = 3 credits (10s at $0.045/s)
    if (generationType === 'seedance-1-pro') {
      cost = 1;
    } else if (generationType === 'wan-2.1-i2v-480p') {
      cost = 3;
    } else if (generationType === 'hailuo-02') {
      cost = 3;
    } else {
      // Default to kling-v1.6-standard
      cost = 2;
    }
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
    // If prompt was enhanced, update the database record with the enhanced prompt
    // Keep the original prompt in the 'prompt' field
    if (enhancePrompt && effectivePrompt !== prompt) {
      await prisma.video.update({
        where: { id: videoRecord.id },
        data: { enhancedPrompt: effectivePrompt },
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

    // Select model based on generation type
    let modelVersion = KLING_REPLICATE_MODEL_VERSION;
    let modelInputs: Record<string, string | number | boolean> = {};
    
    if (generationType === 'seedance-1-pro') {
      modelVersion = SEEDANCE_REPLICATE_MODEL_VERSION;
      // ByteDance SeedDance-1-Pro model inputs
      modelInputs = {
        image: signedUrl ?? imageUrl,
        prompt: effectivePrompt,
        duration: 5,
        resolution: "480p",
        aspect_ratio: "16:9",
        fps: 24,
      };
    } else if (generationType === 'kling-v1.6-standard') {
      modelVersion = KLING_REPLICATE_MODEL_VERSION;
      // Kling v1.6 Standard model inputs
      modelInputs = {
        prompt: effectivePrompt,
        duration: 5,
        aspect_ratio: "16:9",
        start_image: signedUrl ?? imageUrl,
        cfg_scale: 0.5,
      };
    } else if (generationType === 'wan-2.1-i2v-480p') {
      modelVersion = WAN_REPLICATE_MODEL_VERSION;
      // wan-2.1-i2v-480p model inputs
      modelInputs = {
        image: signedUrl ?? imageUrl,
        prompt: effectivePrompt,
        sample_steps: sampleSteps,
        sample_guidance_scale: sampleGuideScale,
      };
    } else if (generationType === 'hailuo-02') {
      modelVersion = HAILUO_REPLICATE_MODEL_VERSION;
      // minimax/hailuo-02 model inputs
      modelInputs = {
        prompt: effectivePrompt,
        duration: 10,
        resolution: "768p",
        prompt_optimizer: true,
        first_frame_image: signedUrl ?? imageUrl,
      };
    }

    // If using Kling, SeedDance, or Hailuo model, skip primary API and use Replicate directly
    if (generationType === 'kling-v1.6-standard' || generationType === 'seedance-1-pro' || generationType === 'hailuo-02') {
      // Construct webhook URL for Vercel deployment
      let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
      
      // If no base URL is set, try to construct from request headers
      if (!baseUrl) {
        const headersList = await headers();
        const forwardedHost = headersList.get('x-forwarded-host');
        const forwardedProto = headersList.get('x-forwarded-proto') || 'https';
        const host = headersList.get('host');
        
        if (forwardedHost) {
          baseUrl = `${forwardedProto}://${forwardedHost}`;
        } else if (host) {
          // In production, default to HTTPS
          const protocol = host.includes('localhost') ? 'http' : 'https';
          baseUrl = `${protocol}://${host}`;
        } else {
          // Fallback for local development
          baseUrl = 'http://localhost:3000';
        }
      }
      
      // Ensure HTTPS for production URLs
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `https://${baseUrl}`;
      }
      
      // For production, always use HTTPS (except localhost)
      if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      
      const webhookUrl = `${baseUrl}/api/replicate-webhook`;
      console.log('Webhook URL:', webhookUrl);
      
      // For local development, don't use webhooks since Replicate requires HTTPS
      const isLocalDevelopment = baseUrl.includes('localhost') || baseUrl.startsWith('http://');
      
      // Build prediction options based on environment
      let prediction;
      if (!isLocalDevelopment) {
        // Production with webhook
        prediction = await replicate.predictions.create({
          version: modelVersion,
          input: modelInputs,
          webhook: webhookUrl,
          webhook_events_filter: ["start", "output", "logs", "completed"],
        });
      } else {
        // Local development without webhook
        console.log('Local development detected - webhook disabled, will use polling instead');
        console.log('Using model version:', modelVersion);
        console.log('Model inputs:', modelInputs);
        
        try {
          prediction = await replicate.predictions.create({
            version: modelVersion,
            input: modelInputs,
          });
        } catch (replicateError) {
          console.error('Replicate API error:', replicateError);
          // If the model version is invalid, provide a helpful error message
          if (replicateError instanceof Error && replicateError.message.includes('version does not exist')) {
            throw new Error(`Invalid Replicate model version: ${modelVersion}. Please check if the model is still available or update to a newer version.`);
          }
          throw replicateError;
        }
      }
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
    // Construct webhook URL for Vercel deployment
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;
    
    // If no base URL is set, try to construct from request headers
    if (!baseUrl) {
      const headersList = await headers();
      const forwardedHost = headersList.get('x-forwarded-host');
      const forwardedProto = headersList.get('x-forwarded-proto') || 'https';
      const host = headersList.get('host');
      
      if (forwardedHost) {
        baseUrl = `${forwardedProto}://${forwardedHost}`;
      } else if (host) {
        // In production, default to HTTPS
        const protocol = host.includes('localhost') ? 'http' : 'https';
        baseUrl = `${protocol}://${host}`;
      } else {
        // Fallback for local development
        baseUrl = 'http://localhost:3000';
      }
    }
    
    // Ensure HTTPS for production URLs
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // For production, always use HTTPS (except localhost)
    if (baseUrl.startsWith('http://') && !baseUrl.includes('localhost')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    
    const webhookUrl = `${baseUrl}/api/replicate-webhook`;
    console.log('Premium fallback webhook URL:', webhookUrl);
    
    // For local development, don't use webhooks since Replicate requires HTTPS
    const isLocalDevelopment = baseUrl.includes('localhost') || baseUrl.startsWith('http://');
    
    let prediction;
    if (!isLocalDevelopment) {
      // Production with webhook
      prediction = await replicate.predictions.create({
        version: modelVersion,
        input: modelInputs,
        webhook: webhookUrl,
        webhook_events_filter: ["start", "output", "logs", "completed"],
      });
    } else {
      // Local development without webhook
      console.log('Local development detected for fallback - webhook disabled, will use polling instead');
      console.log('Using model version:', modelVersion);
      console.log('Model inputs:', modelInputs);
      prediction = await replicate.predictions.create({
        version: modelVersion,
        input: modelInputs,
      });
    }
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
        await addCredits(userId, cost);
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