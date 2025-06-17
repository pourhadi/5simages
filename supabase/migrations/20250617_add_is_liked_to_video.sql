-- Add isLiked column to Video table
ALTER TABLE "Video" 
ADD COLUMN IF NOT EXISTS "isLiked" BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN "Video"."isLiked" IS 'Whether the user has liked this video';