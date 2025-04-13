// Import dotenv to load environment variables directly
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env and .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable environment variables loading
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET_NAME: process.env.NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET_NAME,
    NEXT_PUBLIC_SUPABASE_VIDEOS_BUCKET_NAME: process.env.NEXT_PUBLIC_SUPABASE_VIDEOS_BUCKET_NAME,
    REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN
  },
  // Other Next.js configuration
  reactStrictMode: true,
  images: {
    domains: ['afzjzoefogvzdnqmnidz.supabase.co'],
  },
};

// Log environment variables status for debugging
console.log('Environment variables status:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Loaded' : 'Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Loaded' : 'Missing');

export default nextConfig; 