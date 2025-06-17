import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Storage bucket names - store in environment variables for consistency
export const STORAGE_BUCKETS = {
  IMAGES: process.env.NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET_NAME || 'images',
  VIDEOS: process.env.NEXT_PUBLIC_SUPABASE_VIDEOS_BUCKET_NAME || 'videos',
};

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key environment variables.');
  console.log('Current URL:', supabaseUrl);
  console.log('Current Anon Key:', supabaseAnonKey ? 'Exists (hidden)' : 'Missing');
  // Throwing error might break build process, log error instead for broader compatibility
  // throw new Error('Missing Supabase URL or Anon Key environment variables.');
}

// Client for client-side operations (using Anon key)
export const supabase: SupabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-application-name': 'i2v-webapp',
    },
  },
});

// Client for server-side admin operations (using Service Role key)
let supabaseAdminSingleton: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (supabaseAdminSingleton) {
        return supabaseAdminSingleton;
    }

    if (!supabaseServiceKey) {
        console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations (like file deletion) will fail.')
        // Return the regular client as a fallback to avoid hard crashes, 
        // but admin operations won't work.
        return supabase; 
    }
    if (!supabaseUrl) {
        console.error('Missing Supabase URL for admin client.');
        return supabase; // Fallback
    }

    supabaseAdminSingleton = createClient(supabaseUrl, supabaseServiceKey, {
         auth: { persistSession: false }, // No need to persist session for server-side
         global: {
           headers: {
             'x-application-name': 'i2v-webapp-admin',
           },
         },
    });
    return supabaseAdminSingleton;
}

/**
 * Generate a storage path for user uploads
 * Always namespaces files under the user's ID for proper access control
 */
export function getUserStoragePath(userId: string, filename: string): string {
  // Ensure we have a clean filename by replacing problematic characters
  const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  // Always namespace under userId for security
  return `${userId}/${crypto.randomUUID()}_${safeFilename}`;
}

/**
 * Helper to generate a public URL for a file in a Supabase bucket
 */
export function getPublicUrl(bucket: string, path: string): string | null {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
} 