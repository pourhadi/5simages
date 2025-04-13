'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Info, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import BuyCreditsButton from '@/components/BuyCreditsButton';

interface Video {
  id: string;
  imageUrl: string;
  videoUrl: string | null;
  prompt: string;
  status: string;
  createdAt: string;
}

export default function GalleryPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const showCredits = searchParams.get('showCredits') === 'true';

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (authStatus === 'authenticated') {
      fetchUserData();
      fetchVideos();
    }
  }, [authStatus, router]);

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/user');
      const data = await response.json();
      
      if (response.ok) {
        setUserCredits(data.credits);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/videos');
      
      if (!response.ok) {
        throw new Error(`Error fetching videos: ${response.status}`);
      }
      
      const data = await response.json();
      setVideos(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setError('Failed to load your videos. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Gallery</h1>
        
        {/* Credits and purchase button */}
        <div className="mt-4 md:mt-0 flex items-center space-x-4">
          <div className="flex items-center bg-gray-100 px-4 py-2 rounded-lg">
            <span className="text-gray-700 font-medium">Credits:</span>
            <span className="ml-2 font-bold text-lg">{userCredits !== null ? userCredits : '...'}</span>
          </div>
          <BuyCreditsButton variant="default" />
        </div>
      </div>

      {/* Show notification about credits when coming from credit purchase flow */}
      {showCredits && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
          <Info className="text-blue-500 h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800">Credits Updated</h3>
            <p className="text-blue-600 text-sm">
              Your credit balance is updated and ready to use for creating new videos.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500">Loading your videos...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-red-500 h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No videos yet</h2>
          <p className="text-gray-500 mb-6">
            You haven&apos;t created any videos yet. Start by creating your first one!
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <Link 
              href="/" 
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Create Your First Video
            </Link>
            {/* Low credit message if applicable */}
            {userCredits !== null && userCredits < 1 && (
              <BuyCreditsButton variant="default" className="mt-2 md:mt-0" />
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                {video.videoUrl ? (
                  <video 
                    src={video.videoUrl} 
                    controls 
                    className="w-full h-full object-cover"
                    poster={video.imageUrl}
                  />
                ) : (
                  <div className="w-full h-full relative">
                    <img 
                      src={video.imageUrl} 
                      alt={video.prompt} 
                      className="w-full h-full object-cover"
                    />
                    {video.status === 'processing' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="text-center p-4">
                          <Loader2 className="mx-auto w-8 h-8 text-white animate-spin mb-2" />
                          <p className="text-white text-sm font-medium">Processing...</p>
                        </div>
                      </div>
                    )}
                    {video.status === 'failed' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="text-center p-4">
                          <AlertCircle className="mx-auto w-8 h-8 text-red-500 mb-2" />
                          <p className="text-white text-sm font-medium">Processing failed</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="text-gray-700 line-clamp-2 min-h-[2.5rem]">{video.prompt}</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </span>
                  {video.status === 'completed' && (
                    <a 
                      href={video.videoUrl || ''} 
                      download 
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Low credit warning for users with videos but low credits */}
      {!isLoading && videos.length > 0 && userCredits !== null && userCredits < 1 && (
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-amber-500 h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-amber-800 font-medium">You&apos;re out of credits</h3>
            <p className="text-amber-700 text-sm mb-3">
              You need credits to create new videos. Purchase more credits to continue creating.
            </p>
            <BuyCreditsButton variant="small" />
          </div>
        </div>
      )}
    </div>
  );
} 