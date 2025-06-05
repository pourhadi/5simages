import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const mergetrainPath = path.join(process.cwd(), 'public', 'mergetrain');
    
    // Check if directory exists
    if (!fs.existsSync(mergetrainPath)) {
      return NextResponse.json({ files: [] });
    }

    // Read directory contents
    const files = fs.readdirSync(mergetrainPath);
    
    // Filter for MP3 files only
    const mp3Files = files
      .filter(file => file.toLowerCase().endsWith('.mp3'))
      .map(file => ({
        name: file.replace('.mp3', '').replace(/[-_]/g, ' '),
        filename: file,
        url: `/mergetrain/${file}`
      }));

    return NextResponse.json({ files: mp3Files });
  } catch (error) {
    console.error('Error reading mergetrain directory:', error);
    return NextResponse.json({ error: 'Failed to read files' }, { status: 500 });
  }
}