ALTER TABLE "Video"
ADD COLUMN "type" TEXT;

UPDATE "Video"
SET "type" = 'fast';