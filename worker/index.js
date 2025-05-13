#!/usr/bin/env node
// Worker service: polls the database for processing videos, converts to GIF, uploads, and updates records
const Replicate = require('replicate');
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

// Configure FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Environment variables
const replicateToken = process.env.REPLICATE_API_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const gifsBucket = process.env.SUPABASE_GIFS_BUCKET_NAME || 'gifs';

if (!replicateToken) throw new Error('REPLICATE_API_TOKEN not set');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');

// Clients
const replicate = new Replicate({ auth: replicateToken });
const prisma = new PrismaClient();
const supabase = createClient(supabaseUrl, supabaseKey);

// Process a single video record
async function processVideo(video) {
  try {
    const { id, userId, replicatePredictionId, type, videoUrl, gifUrl } = video;
    // Step 1: If videoUrl is not yet set, check prediction status
    if (!videoUrl) {
      console.log(`Checking prediction for video ${id}`);
      const prediction = await replicate.predictions.get(replicatePredictionId);
      if (prediction.status === 'succeeded') {
        let output = prediction.output;
        let url = null;
        if (typeof output === 'string') url = output;
        else if (Array.isArray(output) && output.length) url = output[0];
        if (url) {
          await prisma.video.update({ where: { id }, data: { videoUrl: url } });
          console.log(`Updated videoUrl for ${id}`);
        } else {
          throw new Error('Invalid prediction output');
        }
      } else if (prediction.status === 'failed') {
        await prisma.video.update({ where: { id }, data: { status: 'failed' } });
        const refund = type === 'slow' ? 1 : 2;
        await prisma.user.update({ where: { id: userId }, data: { credits: { increment: refund } } });
        console.log(`Prediction failed for ${id}. Refunded ${refund} credits.`);
      } else {
        console.log(`Prediction ${id} status: ${prediction.status}`);
      }
    }
    // Step 2: If we have a videoUrl but no gifUrl, convert and upload
    else if (videoUrl && !gifUrl) {
      console.log(`Converting video to GIF for ${id}`);
      // Download the video
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const tmpMp4 = path.join('/tmp', `${id}.mp4`);
      const tmpGif = path.join('/tmp', `${id}.gif`);
      fs.writeFileSync(tmpMp4, Buffer.from(arrayBuffer));
      // Convert to GIF
      await new Promise((resolve, reject) => {
        ffmpeg(tmpMp4)
          .outputOptions(['-vf', 'fps=16,scale=320:-1:flags=lanczos'])
          .toFormat('gif')
          .save(tmpGif)
          .on('end', resolve)
          .on('error', reject);
      });
      const gifBuffer = fs.readFileSync(tmpGif);
      const gifPath = `${userId}/${id}.gif`;
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage.from(gifsBucket).upload(gifPath, gifBuffer, { contentType: 'image/gif' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(gifsBucket).getPublicUrl(gifPath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Could not get public URL for GIF');
      // Update record
      await prisma.video.update({ where: { id }, data: { gifUrl: publicUrl, status: 'completed' } });
      console.log(`Video ${id} processing completed: ${publicUrl}`);
      // Cleanup temp files
      try { fs.unlinkSync(tmpMp4); fs.unlinkSync(tmpGif); } catch {}
    }
  } catch (err) {
    console.error(`Error processing video ${video.id}:`, err);
    // Mark as failed and refund credits
    try {
      await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
      const refund = video.type === 'slow' ? 1 : 2;
      await prisma.user.update({ where: { id: video.userId }, data: { credits: { increment: refund } } });
      console.log(`Refunded ${refund} credits for video ${video.id}`);
    } catch (refundErr) {
      console.error('Error during refund process:', refundErr);
    }
  }
}

// Main loop
async function main() {
  console.log('Worker started, polling every 10s');
  while (true) {
    try {
      const videos = await prisma.video.findMany({ where: { status: 'processing' } });
      for (const video of videos) {
        await processVideo(video);
      }
    } catch (loopErr) {
      console.error('Worker loop error:', loopErr);
    }
    await new Promise((res) => setTimeout(res, 10000));
  }
}

main().catch((e) => {
  console.error('Fatal error in worker:', e);
  process.exit(1);
});