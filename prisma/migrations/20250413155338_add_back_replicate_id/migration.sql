/*
  Warnings:

  - A unique constraint covering the columns `[replicatePredictionId]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Video" ADD COLUMN "replicatePredictionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Video_replicatePredictionId_key" ON "Video"("replicatePredictionId");
