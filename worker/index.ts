import Replicate from 'replicate';
import prisma from '../src/lib/prisma';
import { getSupabaseAdmin } from '../src/lib/supabaseClient';
import { randomUUID } from 'crypto';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN || '' });

const GIFS_BUCKET = process.env.SUPABASE_GIFS_BUCKET_NAME || 'gifs';
const PRIMARY_API_URL = process.env.VIDEO_API_URL;
const PRIMARY_API_TOKEN = process.env.VIDEO_API_TOKEN;
const VIDEO2GIF_API_KEY = process.env.VIDEO2GIF_API_KEY || '';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);

async function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}

async function refundCredits(userId: string, type: string) {
  try {
    const amount = type === 'slow' ? 1 : 2;
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    });
  } catch (err) {
    console.error('ERROR_REFUNDING_CREDITS', err);
  }
}

async function uploadGif(userId: string, gifBuffer: Buffer) {
  const supabase = getSupabaseAdmin();
  const gifFileName = `${userId}/${randomUUID()}.gif`;
  const { error } = await supabase.storage
    .from(GIFS_BUCKET)
    .upload(gifFileName, gifBuffer, { contentType: 'image/gif' });
  if (error) throw new Error(`Supabase GIF upload error: ${error.message}`);
  const { data } = await supabase.storage.from(GIFS_BUCKET).getPublicUrl(gifFileName);
  if (!data?.publicUrl) throw new Error('Could not get GIF public URL');
  return data.publicUrl;
}

async function convertVideoToGif(videoData: ArrayBuffer): Promise<Buffer> {
  const formData = new FormData();
  formData.append('fps', '16');
  formData.append('file', new Blob([videoData], { type: 'video/mp4' }), 'video.mp4');
  const createRes = await fetch('https://video2gif-580559758743.us-central1.run.app/jobs', {
    method: 'POST',
    headers: { 'X-API-KEY': VIDEO2GIF_API_KEY },
    body: formData,
  });
  if (!createRes.ok) throw new Error(`Failed to create GIF job: ${createRes.statusText}`);
  const { job_id: jobId } = await createRes.json();
  let status = '';
  do {
    await sleep(2000);
    const statusRes = await fetch(`https://video2gif-580559758743.us-central1.run.app/jobs/${jobId}`, {
      headers: { 'X-API-KEY': VIDEO2GIF_API_KEY },
    });
    if (!statusRes.ok) throw new Error(`Failed to get job status: ${statusRes.statusText}`);
    const js = await statusRes.json();
    status = js.status;
    if (status === 'failed') throw new Error('GIF conversion failed');
  } while (status !== 'finished');
  const gifRes = await fetch(`https://video2gif-580559758743.us-central1.run.app/jobs/${jobId}/gif`, {
    headers: { 'X-API-KEY': VIDEO2GIF_API_KEY },
  });
  if (!gifRes.ok) throw new Error(`Failed to download GIF: ${gifRes.statusText}`);
  const buf = Buffer.from(await gifRes.arrayBuffer());
  return buf;
}

async function handleVideoCompletion(video: any, videoUrl: string) {
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Failed to download ${videoUrl}: ${videoRes.statusText}`);
  const videoData = await videoRes.arrayBuffer();
  const gifBuffer = await convertVideoToGif(videoData);
  const gifUrl = await uploadGif(video.userId, gifBuffer);
  await prisma.video.update({
    where: { id: video.id },
    data: { status: 'completed', videoUrl, gifUrl },
  });
  console.log(`Video ${video.id} completed`);
}

async function processVideo(video: any) {
  if (!video.replicatePredictionId) return;

  // primary API path for fast generation
  if (video.type !== 'slow' && PRIMARY_API_URL && PRIMARY_API_TOKEN) {
    try {
      const statusRes = await fetch(`${PRIMARY_API_URL.replace(/\/+$/, '')}/status/${video.replicatePredictionId}`, {
        headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` },
      });
      if (!statusRes.ok) throw new Error(`Primary status error: ${statusRes.statusText}`);
      const statusData = await statusRes.json();
      const status = statusData.status;
      if (status === 'done') {
        const downloadUrl = `${PRIMARY_API_URL.replace(/\/+$/, '')}/download/${video.replicatePredictionId}`;
        const downloadRes = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` },
        });
        if (!downloadRes.ok) throw new Error(`Primary download error: ${downloadRes.statusText}`);
        const videoData = await downloadRes.arrayBuffer();
        const gifBuffer = await convertVideoToGif(videoData);
        const gifUrl = await uploadGif(video.userId, gifBuffer);
        await prisma.video.update({
          where: { id: video.id },
          data: { status: 'completed', videoUrl: downloadUrl, gifUrl },
        });
        console.log(`Video ${video.id} completed via primary API`);
        return;
      } else if (status === 'failed') {
        await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
        await refundCredits(video.userId, video.type);
        return;
      }
    } catch (err) {
      console.error('Primary API error', err);
    }
  }

  // replicate fallback
  try {
    const prediction = await replicate.predictions.get(video.replicatePredictionId);
    if (prediction.status === 'succeeded') {
      const outputUrl = prediction.output;
      const videoUrl = typeof outputUrl === 'string' ? outputUrl : Array.isArray(outputUrl) ? outputUrl[0] : null;
      if (!videoUrl) throw new Error('No video URL from Replicate');
      await handleVideoCompletion(video, videoUrl);
    } else if (prediction.status === 'failed') {
      await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
      await refundCredits(video.userId, video.type);
    }
  } catch (err) {
    console.error('Replicate error', err);
  }
}

async function pollLoop() {
  while (true) {
    const videos = await prisma.video.findMany({ where: { status: 'processing' }, take: 5 });
    for (const v of videos) {
      await processVideo(v);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

pollLoop().catch(err => { console.error(err); process.exit(1); });
