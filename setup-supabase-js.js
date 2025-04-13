// Run this script to set up required Supabase storage buckets with proper policies
// Usage: node setup-supabase-js.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Note: Must use service role key for admin operations

// Define storage buckets
const STORAGE_BUCKETS = {
  IMAGES: process.env.NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET_NAME || 'images',
  VIDEOS: process.env.NEXT_PUBLIC_SUPABASE_VIDEOS_BUCKET_NAME || 'videos',
};

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Service Role Key in environment variables.');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const setupBuckets = async () => {
  try {
    console.log('Setting up Supabase storage buckets...');

    // 1. Create images bucket (user uploads, private by default)
    const { error: imagesError } = await supabase.storage.createBucket(STORAGE_BUCKETS.IMAGES, {
      public: false, // Prevent public access by default
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg']
    });

    if (imagesError) {
      if (imagesError.message.includes('already exists')) {
        console.log(`✓ ${STORAGE_BUCKETS.IMAGES} bucket already exists`);
      } else {
        throw imagesError;
      }
    } else {
      console.log(`✓ Created ${STORAGE_BUCKETS.IMAGES} bucket successfully`);
    }

    // 2. Create videos bucket (processed results, private by default)
    const { error: videosError } = await supabase.storage.createBucket(STORAGE_BUCKETS.VIDEOS, {
      public: false, // Prevent public access by default
      fileSizeLimit: 52428800, // 50MB limit for videos
      allowedMimeTypes: ['video/mp4']
    });

    if (videosError) {
      if (videosError.message.includes('already exists')) {
        console.log(`✓ ${STORAGE_BUCKETS.VIDEOS} bucket already exists`);
      } else {
        throw videosError;
      }
    } else {
      console.log(`✓ Created ${STORAGE_BUCKETS.VIDEOS} bucket successfully`);
    }

    console.log('\nSetting up storage policies...');

    // 3. Set up policies for images bucket:
    // - Authenticated users can upload to their own folder
    // - Authenticated users can view only their own images
    const imagesPolicies = [
      // Insert policy - Allow users to upload to their own folder
      {
        name: 'Allow authenticated uploads to own folder',
        definition: {
          bucket_id: STORAGE_BUCKETS.IMAGES,
          operation: 'INSERT',
          expression: `auth.uid()::text = storage.foldername(objects.name)[1]`,
          check: `storage.foldername(objects.name)[1] IS NOT NULL`
        }
      },
      // Select policy - Allow users to view only their own images
      {
        name: 'Allow authenticated select of own images',
        definition: {
          bucket_id: STORAGE_BUCKETS.IMAGES,
          operation: 'SELECT',
          expression: `auth.uid()::text = storage.foldername(objects.name)[1]`
        }
      }
    ];

    // 4. Set up policies for videos bucket:
    // - Only service role can upload (backend only)
    // - Users can only view their own videos
    const videosPolicies = [
      // Select policy - Allow users to view only their own videos
      {
        name: 'Allow authenticated select of own videos',
        definition: {
          bucket_id: STORAGE_BUCKETS.VIDEOS,
          operation: 'SELECT',
          expression: `auth.uid()::text = storage.foldername(objects.name)[1]`
        }
      }
      // Note: No INSERT policy for users - only the service role can insert videos
    ];

    // Apply the policies
    for (const policy of [...imagesPolicies, ...videosPolicies]) {
      try {
        // Try to create the policy
        const { error } = await supabase.storage.from(policy.definition.bucket_id)
          .createPolicy(policy.name, policy.definition);
        
        if (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ✓ Policy '${policy.name}' already exists for ${policy.definition.bucket_id}`);
          } else {
            throw error;
          }
        } else {
          console.log(`  ✓ Created policy '${policy.name}' for ${policy.definition.bucket_id}`);
        }
      } catch (error) {
        console.error(`  ✗ Error creating policy '${policy.name}': ${error.message}`);
      }
    }

    console.log('\nStorage setup complete! 🎉');
  } catch (error) {
    console.error('Error setting up storage:', error);
    process.exit(1);
  }
};

setupBuckets(); 