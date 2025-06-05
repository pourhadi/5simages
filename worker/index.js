import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import { randomUUID } from 'crypto';
import prisma from '../prisma/client.js';
import http from 'http';

// Simple HTTP server to satisfy Cloud Run readiness (listen on $PORT)
const port = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(port, () => {
  console.log(`HTTP server listening on port ${port}`);
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
}
const supabase = createClient(supabaseUrl, supabaseKey);

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN || '' });
const GIFS_BUCKET = process.env.SUPABASE_GIFS_BUCKET_NAME || 'gifs';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);
const PRIMARY_API_URL = process.env.VIDEO_API_URL ?? process.env.PRIMARY_API_URL;
const PRIMARY_API_TOKEN = process.env.VIDEO_API_TOKEN ?? process.env.PRIMARY_API_TOKEN;
const VIDEO2GIF_API_KEY = process.env.VIDEO2GIF_API_KEY;

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function convertAndUploadGif(userId, videoData) {
  if (!VIDEO2GIF_API_KEY) throw new Error('VIDEO2GIF_API_KEY not set');
  const form = new FormData();
  form.append('fps', '16');
  form.append('file', new Blob([videoData], { type: 'video/mp4' }), 'video.mp4');
  const createRes = await fetch('https://video2gif-580559758743.us-central1.run.app/jobs', {
    method: 'POST',
    headers: { 'X-API-KEY': VIDEO2GIF_API_KEY },
    body: form,
  });
  if (!createRes.ok) throw new Error(`Failed to create GIF job: ${createRes.statusText}`);
  const { job_id } = await createRes.json();
  let jobStatus = '';
  do {
    await delay(2000);
    const statusRes = await fetch(`https://video2gif-580559758743.us-central1.run.app/jobs/${job_id}`, {
      headers: { 'X-API-KEY': VIDEO2GIF_API_KEY },
    });
    if (!statusRes.ok) throw new Error(`Failed to get job status: ${statusRes.statusText}`);
    const statusJson = await statusRes.json();
    jobStatus = statusJson.status;
    if (jobStatus === 'failed') throw new Error('GIF conversion failed');
  } while (jobStatus !== 'finished');

  const gifRes = await fetch(`https://video2gif-580559758743.us-central1.run.app/jobs/${job_id}/gif`, {
    headers: { 'X-API-KEY': VIDEO2GIF_API_KEY },
  });
  if (!gifRes.ok) throw new Error(`Failed to download GIF: ${gifRes.statusText}`);
  const gifBuffer = Buffer.from(await gifRes.arrayBuffer());
  const gifFileName = `${userId}/${randomUUID()}.gif`;
  const { error } = await supabase.storage.from(GIFS_BUCKET).upload(gifFileName, gifBuffer, { contentType: 'image/gif' });
  if (error) throw new Error(`Supabase GIF upload error: ${error.message}`);
  const { data } = await supabase.storage.from(GIFS_BUCKET).getPublicUrl(gifFileName);
  if (!data?.publicUrl) throw new Error('Could not get GIF public URL');
  return data.publicUrl;
}

async function processVideo(video) {
  try {
    // For fast generation, try Primary API first, then fall back to Replicate
    if (video.type !== 'slow' && PRIMARY_API_URL && PRIMARY_API_TOKEN) {
      try {
        const statusRes = await fetch(`${PRIMARY_API_URL.replace(/\/+$/, '')}/status/${video.replicatePredictionId}`, {
          headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` },
        });
        if (!statusRes.ok) throw new Error(`Primary API status failed: ${statusRes.statusText}`);
        const statusData = await statusRes.json();
        const status = statusData.status;
        if (status === 'done') {
          const downloadUrl = `${PRIMARY_API_URL.replace(/\/+$/, '')}/download/${video.replicatePredictionId}`;
          const downloadRes = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` } });
          if (!downloadRes.ok) throw new Error(`Primary API download failed: ${downloadRes.statusText}`);
          const videoData = await downloadRes.arrayBuffer();
          const gifUrl = await convertAndUploadGif(video.userId, videoData);
          await prisma.video.update({ where: { id: video.id }, data: { status: 'completed', videoUrl: downloadUrl, gifUrl } });
          console.log(`Video ${video.id} processed successfully via Primary API`);
          return;
        } else if (status === 'failed') {
          await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
          console.log(`Video ${video.id} failed via Primary API`);
          return;
        }
        // Status is still processing, continue polling
        return;
      } catch (err) {
        console.error('Primary API error, falling back to Replicate:', err);
        // Fall through to Replicate processing
      }
    }

    // For slow generation or Primary API fallback, use Replicate
    const prediction = await replicate.predictions.get(video.replicatePredictionId);
    if (prediction.status === 'succeeded') {
      const output = prediction.output;
      const videoUrl = typeof output === 'string' ? output : Array.isArray(output) ? output[0] : null;
      if (!videoUrl) throw new Error('Invalid output URL');
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error(`Failed to download from ${videoUrl}: ${videoRes.statusText}`);
      const videoData = await videoRes.arrayBuffer();
      const gifUrl = await convertAndUploadGif(video.userId, videoData);
      await prisma.video.update({ where: { id: video.id }, data: { status: 'completed', videoUrl, gifUrl } });
      console.log(`Video ${video.id} processed successfully via Replicate (${video.type === 'slow' ? 'Kling v1.6' : 'WAN-2.1'})`);
    } else if (prediction.status === 'failed') {
      await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
      console.log(`Video ${video.id} failed via Replicate`);
    }
    // If still processing, continue polling
  } catch (err) {
    console.error(`Error processing video ${video.id}:`, err);
    await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } }).catch(() => {});
  }
}

async function run() {
  while (true) {
    const videos = await prisma.video.findMany({ where: { status: 'processing' } });
    for (const video of videos) {
      if (!video.replicatePredictionId) continue;
      console.log(`Processing video ${video.id}...`);
      await processVideo(video);
    }
    await delay(POLL_INTERVAL_MS);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
