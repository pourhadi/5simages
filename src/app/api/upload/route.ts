import { NextResponse, NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { STORAGE_BUCKETS } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = authResult;
    const userId = user.id;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }
    
    // Parse form data (containing the file)
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }
    
    // Check file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }
    
    // Generate a unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${userId}/${randomUUID()}.${fileExtension}`;
    
    // Create Supabase client with user session
    const supabase = await createSupabaseServerClient();
    
    // Upload the file to Supabase Storage
    const buffer = await file.arrayBuffer();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKETS.IMAGES)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
    
    // Generate a signed URL for the uploaded file (since bucket is private)
    // URL expires in 1 year (31536000 seconds)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(STORAGE_BUCKETS.IMAGES)
      .createSignedUrl(fileName, 31536000);
    
    if (urlError || !signedUrlData?.signedUrl) {
      console.error('Failed to generate signed URL:', urlError);
      return NextResponse.json({ error: 'Failed to generate file URL' }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      url: signedUrlData.signedUrl
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
} 