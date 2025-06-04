import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { randomUUID } from 'crypto';
import crypto from 'crypto';

// Supabase bucket for GIFs
const GIFS_BUCKET = process.env.SUPABASE_GIFS_BUCKET_NAME || 'gifs';

// Replicate webhook secret for signature verification
const REPLICATE_WEBHOOK_SECRET = process.env.REPLICATE_WEBHOOK_SECRET;

interface ReplicateWebhookPayload {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  urls?: {
    get: string;
    cancel: string;
  };
  version: string;
  input: Record<string, unknown>;
  logs?: string;
  metrics?: {
    predict_time?: number;
  };
}

// Verify webhook signature from Replicate
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) {
    return false;
  }
  
  const expectedSignature = signature.slice(7); // Remove 'sha256=' prefix
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  );
}


async function uploadGifToSupabase(gifData: ArrayBuffer, userId: string): Promise<string> {
  const supabaseAdmin = getSupabaseAdmin();
  const gifFileName = `${userId}/${randomUUID()}.gif`;
  const gifBuffer = Buffer.from(gifData);
  
  const { error: uploadError } = await supabaseAdmin.storage
    .from(GIFS_BUCKET)
    .upload(gifFileName, gifBuffer, { contentType: 'image/gif' });
    
  if (uploadError) {
    throw new Error(`Supabase GIF upload error: ${uploadError.message}`);
  }
  
  const { data: gifUrlData } = await supabaseAdmin.storage
    .from(GIFS_BUCKET)
    .getPublicUrl(gifFileName);
    
  if (!gifUrlData?.publicUrl) {
    throw new Error('Could not get GIF public URL');
  }
  
  return gifUrlData.publicUrl;
}

async function refundCredits(userId: string, videoType: string): Promise<void> {
  try {
    const refundAmount = videoType === 'slow' ? 1 : 2;
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: refundAmount } },
    });
  } catch (error) {
    console.error('ERROR_REFUNDING_CREDITS', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Verify webhook signature if secret is configured
    if (REPLICATE_WEBHOOK_SECRET) {
      const signature = request.headers.get('replicate-signature');
      if (!signature) {
        console.error('Missing webhook signature');
        return new NextResponse('Missing signature', { status: 401 });
      }
      
      if (!verifyWebhookSignature(body, signature, REPLICATE_WEBHOOK_SECRET)) {
        console.error('Invalid webhook signature');
        return new NextResponse('Invalid signature', { status: 401 });
      }
    }
    
    // Parse the webhook payload
    const payload: ReplicateWebhookPayload = JSON.parse(body);
    console.log('Received Replicate webhook:', { id: payload.id, status: payload.status });
    
    // Find the video record by prediction ID
    const video = await prisma.video.findFirst({
      where: { replicatePredictionId: payload.id },
      include: { user: true },
    });
    
    if (!video) {
      console.error('Video not found for prediction ID:', payload.id);
      return new NextResponse('Video not found', { status: 404 });
    }
    
    // Handle different status updates
    if (payload.status === 'succeeded') {
      try {
        // Get the output URL from the prediction
        const outputUrl = payload.output;
        
        if (!outputUrl || (typeof outputUrl !== 'string' && !Array.isArray(outputUrl))) {
          throw new Error('No output URL from Replicate');
        }
        
        // Handle either string or array output
        const videoUrl = typeof outputUrl === 'string' ? outputUrl : Array.isArray(outputUrl) ? outputUrl[0] : null;
        
        if (!videoUrl) {
          throw new Error('Invalid output format from Replicate');
        }
        
        // Download video and convert to GIF
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        
        const videoData = await videoResponse.arrayBuffer();
        
        // Convert to GIF using external service
        const apiKey = 'dabf5af2d8d1138dee335941f670a1c2a6218cd2197b95f2178d8d21247e8bc6';
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
        
        // Poll for job completion
        let jobStatus = '';
        let attempts = 0;
        const maxAttempts = 30;
        
        do {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          
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
          
          attempts++;
        } while (jobStatus !== 'finished' && attempts < maxAttempts);
        
        if (jobStatus !== 'finished') {
          throw new Error('GIF conversion timeout');
        }
        
        // Download the generated GIF
        const gifResponse = await fetch(
          `https://video2gif-580559758743.us-central1.run.app/jobs/${jobId}/gif`,
          { headers: { 'X-API-KEY': apiKey } }
        );
        
        if (!gifResponse.ok) {
          throw new Error(`Failed to download GIF: ${gifResponse.statusText}`);
        }
        
        const gifArrayBuffer = await gifResponse.arrayBuffer();
        
        // Upload GIF to Supabase
        const gifUrl = await uploadGifToSupabase(gifArrayBuffer, video.userId);
        
        // Update video record with success
        await prisma.video.update({
          where: { id: video.id },
          data: {
            status: 'completed',
            videoUrl: videoUrl,
            gifUrl: gifUrl,
          },
        });
        
        console.log('Successfully processed video webhook:', video.id);
        
      } catch (error) {
        console.error('Error processing succeeded prediction:', error);
        
        // Update video record with failure
        await prisma.video.update({
          where: { id: video.id },
          data: { status: 'failed' },
        });
        
        // Refund credits
        await refundCredits(video.userId, video.type);
      }
    } else if (payload.status === 'failed' || payload.status === 'canceled') {
      // Update video record with failure
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'failed' },
      });
      
      // Refund credits
      await refundCredits(video.userId, video.type);
      
      console.log('Video generation failed/canceled, credits refunded:', video.id);
    } else {
      // For 'starting' or 'processing' status, just acknowledge
      console.log('Video status update:', { videoId: video.id, status: payload.status });
    }
    
    return new NextResponse('OK', { status: 200 });
    
  } catch (error) {
    console.error('Error in Replicate webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}