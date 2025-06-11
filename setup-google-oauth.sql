-- This SQL script configures Google OAuth in Supabase
-- Run this in the Supabase SQL editor

-- First, ensure the auth schema exists
CREATE SCHEMA IF NOT EXISTS auth;

-- Update the auth providers configuration
-- Note: This is typically done through the Supabase dashboard, but here's the SQL equivalent
-- You'll need to configure this in the Supabase dashboard under Authentication > Providers > Google

-- The configuration should be:
-- Client ID: 580559758743-smvvvip811bibamnkfkanlbf6t1nopse.apps.googleusercontent.com
-- Client Secret: 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
-- Authorized redirect URIs: https://afzjzoefogvzdnqmnidz.supabase.co/auth/v1/callback

-- Enable Google provider (this is usually done via dashboard)
-- UPDATE auth.providers SET enabled = true WHERE provider = 'google';

-- Ensure email confirmation is not required for OAuth users
-- OAuth users are considered pre-verified
ALTER TABLE auth.users ALTER COLUMN email_confirmed_at SET DEFAULT NOW();

-- Create a trigger to sync OAuth users to our custom users table
CREATE OR REPLACE FUNCTION public.handle_new_oauth_user()
RETURNS trigger AS $$
BEGIN
  -- Only process OAuth users (those without a password)
  IF NEW.encrypted_password IS NULL OR NEW.encrypted_password = '' THEN
    INSERT INTO public."User" (id, email, name, "emailVerified", image, credits, "createdAt", "updatedAt", password)
    VALUES (
      NEW.id::text,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NOW(),
      NEW.raw_user_meta_data->>'avatar_url',
      5, -- Welcome bonus
      NOW(),
      NOW(),
      '' -- Empty password for OAuth users
    )
    ON CONFLICT (email) DO UPDATE
    SET 
      "emailVerified" = EXCLUDED."emailVerified",
      image = COALESCE(public."User".image, EXCLUDED.image),
      "updatedAt" = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new OAuth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_oauth_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO postgres, service_role;