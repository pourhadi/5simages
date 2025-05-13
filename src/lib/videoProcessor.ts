import Replicate from 'replicate';
import prisma from '@/lib/prisma';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { randomUUID } from 'crypto';

// Initialize Replicate client
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN || '' });

// Supabase GIFs bucket name
const GIFS_BUCKET = process.env.SUPABASE_GIFS_BUCKET_NAME || 'gifs';

/**
 * Process all pending video records: check status, convert to GIF, upload, and update DB.
 */
/**
 * Process a single video record: check status, convert to GIF, upload, and update DB.
 */
export async function processSingleVideo(videoId: string): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video || video.status !== 'processing' || !video.replicatePredictionId) return;
  try {
    // Setup primary API config for fast mode
    const PRIMARY_API_URL = process.env.VIDEO_API_URL ?? process.env.PRIMARY_API_URL;
    const PRIMARY_API_TOKEN = process.env.VIDEO_API_TOKEN ?? process.env.PRIMARY_API_TOKEN;
    // If fast mode and primary API is configured, use it
    if (video.type !== 'slow' && PRIMARY_API_URL && PRIMARY_API_TOKEN) {
      // Check job status
      const statusRes = await fetch(
        `${PRIMARY_API_URL.replace(/\/+$/, '')}/status/${video.replicatePredictionId}`,
        { method: 'GET', headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` } }
      );
      if (!statusRes.ok) throw new Error(`Primary API status failed: ${statusRes.statusText}`);
      const statusJson = await statusRes.json();
      const status = statusJson.status;
      if (status === 'done') {
        // Download video
        const downloadUrl = `${PRIMARY_API_URL.replace(/\/+$/, '')}/download/${video.replicatePredictionId}`;
        const downloadRes = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${PRIMARY_API_TOKEN}` } });
        if (!downloadRes.ok) throw new Error(`Primary API download failed: ${downloadRes.statusText}`);
        const videoBuffer = Buffer.from(await downloadRes.arrayBuffer());
        // Convert to GIF
        const apiKey = process.env.GIF_CONVERTER_API_KEY;
        if (!apiKey) throw new Error('Missing GIF converter API key');
        const formData = new FormData();
        formData.append('fps', '16');
        formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), 'video.mp4');
        const jobRes = await fetch(process.env.GIF_CONVERTER_URL || '', { method: 'POST', headers: { 'X-API-KEY': apiKey }, body: formData });
        if (!jobRes.ok) throw new Error('GIF job creation failed');
        const { job_id: jobId } = await jobRes.json();
        let jobStatus = '';
        do {
          await new Promise(r => setTimeout(r, 2000));
          const s = await fetch(`${process.env.GIF_CONVERTER_URL}/jobs/${jobId}`, { headers: { 'X-API-KEY': apiKey } });
          if (!s.ok) throw new Error('GIF status fetch failed');
          const j = await s.json(); jobStatus = j.status;
          if (jobStatus === 'failed') throw new Error('GIF conversion failed');
        } while (jobStatus !== 'finished');
        const gifRes = await fetch(`${process.env.GIF_CONVERTER_URL}/jobs/${jobId}/gif`, { headers: { 'X-API-KEY': apiKey } });
        if (!gifRes.ok) throw new Error('GIF download failed');
        const gifBuffer = Buffer.from(await gifRes.arrayBuffer());
        const path = `${video.userId}/${randomUUID()}.gif`;
        const { error: uploadError } = await supabaseAdmin.storage.from(GIFS_BUCKET).upload(path, gifBuffer, { contentType: 'image/gif' });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabaseAdmin.storage.from(GIFS_BUCKET).getPublicUrl(path);
        if (!urlData?.publicUrl) throw new Error('Failed to get GIF public URL');
        await prisma.video.update({ where: { id: video.id }, data: { status: 'completed', videoUrl: downloadUrl, gifUrl: urlData.publicUrl } });
        return;
      } else if (status === 'failed') {
        // Mark failed and refund
        await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
        const refund = video.type === 'slow' ? 1 : 2;
        await prisma.user.update({ where: { id: video.userId }, data: { credits: { increment: refund } } });
        return;
      } else {
        // Still processing
        return;
      }
    }
    // Fallback to replicate pipeline for slow or if primary unavailable
    // Check prediction status
    const prediction = await replicate.predictions.get(video.replicatePredictionId);
    if (prediction.status !== 'succeeded') {
      if (prediction.status === 'failed') {
        // Mark failed and refund credits
        await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
        const refund = video.type === 'slow' ? 1 : 2;
        await prisma.user.update({ where: { id: video.userId }, data: { credits: { increment: refund } } });
      }
      return;
    }
    // prediction succeeded, get output URL (video)
    const output = prediction.output;
    const videoUrl = Array.isArray(output) ? output[0] : output;
    if (typeof videoUrl !== 'string') return;
    // Download video data
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.statusText}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    // Convert to GIF via external service
    const apiKey = process.env.GIF_CONVERTER_API_KEY;
    if (!apiKey) throw new Error('Missing GIF converter API key');
    const formData = new FormData();
    formData.append('fps', '16');
    formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), 'video.mp4');
    const createJob = await fetch(process.env.GIF_CONVERTER_URL || '', {
      method: 'POST', headers: { 'X-API-KEY': apiKey }, body: formData,
    });
    if (!createJob.ok) throw new Error('GIF job creation failed');
    const { job_id: jobId } = await createJob.json();
    // Poll until finished
    let status = '';
    do {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`${process.env.GIF_CONVERTER_URL}/jobs/${jobId}`, { headers: { 'X-API-KEY': apiKey } });
      if (!statusRes.ok) throw new Error('GIF job status fetch failed');
      const json = await statusRes.json(); status = json.status;
      if (status === 'failed') throw new Error('GIF conversion failed');
    } while (status !== 'finished');
    // Download GIF
    const gifRes = await fetch(`${process.env.GIF_CONVERTER_URL}/jobs/${jobId}/gif`, { headers: { 'X-API-KEY': apiKey } });
    if (!gifRes.ok) throw new Error('GIF download failed');
    const gifBuffer = Buffer.from(await gifRes.arrayBuffer());
    // Upload GIF to Supabase
    const path = `${video.userId}/${randomUUID()}.gif`;
    const { error: uploadError } = await supabaseAdmin.storage.from(GIFS_BUCKET).upload(path, gifBuffer, { contentType: 'image/gif' });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabaseAdmin.storage.from(GIFS_BUCKET).getPublicUrl(path);
    if (!urlData?.publicUrl) throw new Error('Failed to get GIF public URL');
    // Update DB record
    await prisma.video.update({ where: { id: video.id }, data: { status: 'completed', videoUrl, gifUrl: urlData.publicUrl } });
  } catch (err) {
    console.error('Error processing video', videoId, err);
  }
}

/*
 * Process all pending videos by iterating and calling processSingleVideo for each.
 */
export async function processPendingVideos(): Promise<void> {
  const pendingVideos = await prisma.video.findMany({ where: { status: 'processing' } });
  await Promise.all(pendingVideos.map(v => processSingleVideo(v.id)));
}
  const supabaseAdmin = getSupabaseAdmin();
  // Fetch all videos still in processing state
  const pendingVideos = await prisma.video.findMany({
    where: { status: 'processing' },
  });
  for (const video of pendingVideos) {
    try {
      // If there's no prediction ID, skip
      if (!video.replicatePredictionId) continue;
      // Check prediction status
      const prediction = await replicate.predictions.get(video.replicatePredictionId);
      if (prediction.status !== 'succeeded') {
        if (prediction.status === 'failed') {
          // Mark failed and refund credits
          await prisma.video.update({ where: { id: video.id }, data: { status: 'failed' } });
          const refund = video.type === 'slow' ? 1 : 2;
          await prisma.user.update({ where: { id: video.userId }, data: { credits: { increment: refund } } });
        }
        continue;
      }
      // prediction succeeded, get output URL (video)
      const output = prediction.output;
      const videoUrl = Array.isArray(output) ? output[0] : output;
      if (typeof videoUrl !== 'string') continue;
      // Download video data
      const videoRes = await fetch(videoUrl);
      if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.statusText}`);
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      // Convert to GIF via external service
      const apiKey = process.env.GIF_CONVERTER_API_KEY;
      if (!apiKey) throw new Error('Missing GIF converter API key');
      const formData = new FormData();
      formData.append('fps', '16');
      formData.append('file', new Blob([videoBuffer], { type: 'video/mp4' }), 'video.mp4');
      const createJob = await fetch(process.env.GIF_CONVERTER_URL || '', {
        method: 'POST', headers: { 'X-API-KEY': apiKey }, body: formData,
      });
      if (!createJob.ok) throw new Error('GIF job creation failed');
      const { job_id: jobId } = await createJob.json();
      // Poll until finished
      let status = '';
      do {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(`${process.env.GIF_CONVERTER_URL}/jobs/${jobId}`, { headers: { 'X-API-KEY': apiKey } });
        if (!statusRes.ok) throw new Error('GIF job status fetch failed');
        const json = await statusRes.json(); status = json.status;
        if (status === 'failed') throw new Error('GIF conversion failed');
      } while (status !== 'finished');
      // Download GIF
      const gifRes = await fetch(`${process.env.GIF_CONVERTER_URL}/jobs/${jobId}/gif`, { headers: { 'X-API-KEY': apiKey } });
      if (!gifRes.ok) throw new Error('GIF download failed');
      const gifBuffer = Buffer.from(await gifRes.arrayBuffer());
      // Upload GIF to Supabase
      const path = `${video.userId}/${randomUUID()}.gif`;
      const { error: uploadError } = await supabaseAdmin.storage.from(GIFS_BUCKET).upload(path, gifBuffer, { contentType: 'image/gif' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabaseAdmin.storage.from(GIFS_BUCKET).getPublicUrl(path);
      if (!urlData?.publicUrl) throw new Error('Failed to get GIF public URL');
      // Update DB record
      await prisma.video.update({
        where: { id: video.id },
        data: { status: 'completed', videoUrl, gifUrl: urlData.publicUrl },
      });
    } catch (err) {
      console.error('Error processing video', video.id, err);
    }
  }
}