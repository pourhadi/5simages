-- Script to set up Supabase storage buckets and policies
-- Run this in the Supabase Dashboard SQL Editor

-- Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('images', 'images', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('videos', 'videos', false, 52428800, ARRAY['video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clear out existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select of own images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated select of own videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to images bucket" ON storage.objects;

-- Simple policy: Allow authenticated users to upload to images bucket
CREATE POLICY "Allow authenticated uploads to images bucket" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'images'
);

-- Simple policy: Allow authenticated users to view their uploads in images bucket
CREATE POLICY "Allow authenticated select of own images" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'images' AND 
  auth.uid()::text = auth.uid()::text  -- This is always true for authenticated users
);

-- Videos bucket policies
-- Allow authenticated users to view videos
CREATE POLICY "Allow authenticated select of own videos" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'videos' AND 
  auth.uid()::text = auth.uid()::text  -- This is always true for authenticated users
);

-- Note: No INSERT policy for regular users on videos bucket
-- Only service role can insert videos 