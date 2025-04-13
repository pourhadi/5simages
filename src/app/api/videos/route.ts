import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { getSupabaseAdmin } from '@/lib/supabaseClient'; // Import admin client getter

const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || 'images';

// Helper function to extract Supabase file path from URL
function getPathFromUrl(url: string | null): string | null {
    if (!url) return null;
    try {
        const urlObject = new URL(url);
        // Path format is typically /storage/v1/object/public/bucket_name/user_id/file.ext
        // We want the part after the bucket name
        const pathSegments = urlObject.pathname.split('/');
        const bucketIndex = pathSegments.indexOf(BUCKET_NAME);
        if (bucketIndex === -1 || bucketIndex + 1 >= pathSegments.length) {
            console.warn(`Could not extract path from URL: ${url}`);
            return null;
        }
        return pathSegments.slice(bucketIndex + 1).join('/');
    } catch (e) {
        console.error(`Error parsing URL ${url}:`, e);
        return null;
    }
}

export async function GET(request: Request) {
  // Request param is required by Next.js API routes even if unused
  void request;
  
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  try {
    const videos = await prisma.video.findMany({
      where: {
        userId: userId,
        // Optionally filter by status, e.g., only show 'completed'
        // status: 'completed', 
      },
      orderBy: {
        createdAt: 'desc', // Show newest first
      },
    });

    return NextResponse.json(videos);

  } catch (error) {
    console.error("ERROR_FETCHING_VIDEOS", error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// Optional: Add DELETE endpoint for deleting videos
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    const userId = session.user.id;

    try {
        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get('id');

        if (!videoId) {
            return new NextResponse('Missing video ID', { status: 400 });
        }

        // Verify the video belongs to the current user before potentially deleting files
        const video = await prisma.video.findUnique({
            where: { id: videoId },
        });

        if (!video) {
            return new NextResponse('Video not found', { status: 404 });
        }

        if (video.userId !== userId) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        // Paths to delete from Supabase Storage
        const pathsToDelete: string[] = [];
        const imagePath = getPathFromUrl(video.imageUrl);
        const videoPath = getPathFromUrl(video.videoUrl);
        if (imagePath) pathsToDelete.push(imagePath);
        if (videoPath) pathsToDelete.push(videoPath);

        // Use a transaction for atomicity: delete DB record *then* files
        // If file deletion fails, the DB record is still gone (consider reversing?)
        await prisma.$transaction(async (tx) => {
            // 1. Delete DB record first
            await tx.video.delete({
                where: { id: videoId },
            });

            // 2. Attempt to delete files from Supabase Storage if paths were found
            if (pathsToDelete.length > 0) {
                const supabaseAdmin = getSupabaseAdmin(); // Get admin client
                 // Check if service key is actually available before attempting deletion
                if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
                    console.warn(`Skipping file deletion for video ${videoId} because SUPABASE_SERVICE_ROLE_KEY is not set.`);
                } else {
                    const { error: deleteError } = await supabaseAdmin.storage
                        .from(BUCKET_NAME)
                        .remove(pathsToDelete);
    
                    if (deleteError) {
                        // Log the error but don't fail the transaction, 
                        // DB record is already deleted.
                        // Consider more robust error handling/retries if needed.
                        console.error(`Failed to delete files [${pathsToDelete.join(', ')}] from Supabase for video ${videoId}:`, deleteError);
                    } else {
                        console.log(`Successfully deleted files [${pathsToDelete.join(', ')}] from Supabase for video ${videoId}.`);
                    }
                }
            }
        });

        return new NextResponse(null, { status: 204 }); // No Content

    } catch (error) {
        console.error("ERROR_DELETING_VIDEO", error);
        return new NextResponse('Internal Error', { status: 500 });
    }
} 