import { NextResponse } from 'next/server';

// Hardcoded list of MP3 files for Vercel deployment
// On Vercel, we can't use fs.readdir to read the public directory
const MP3_FILES = [
  'emo.mp3',
  'gilbert&sullivan.mp3',
  'kircore.mp3',
  'poppunk.mp3',
  'poppunk2.mp3',
  'screamo.mp3'
];

export async function GET() {
  try {
    // On Vercel and in production, we must use the hardcoded list
    // The filesystem is read-only and public directory content isn't accessible via fs
    const mp3Files = MP3_FILES.map(file => ({
      name: file.replace('.mp3', '').replace(/[-_]/g, ' '),
      filename: file,
      url: `/mergetrain/${file}`
    }));

    return NextResponse.json({ files: mp3Files });
  } catch (error) {
    console.error('Error in mergetrain files API:', error);
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}