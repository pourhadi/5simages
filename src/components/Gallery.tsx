'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useSWR from 'swr'; // Import useSWR
import { Video } from '@prisma/client';
import { Trash2, RefreshCw, AlertTriangle, Maximize2, Zap } from 'lucide-react';
import Image from 'next/image';
import VideoDetailModal from './VideoDetailModal';
import CreditPurchase from './CreditPurchase';
import { useSearchParams, useRouter } from 'next/navigation';

// TODO: Fetch and display user's generated videos
// TODO: Add functionality for viewing and deleting videos

// Define a fetcher function for SWR
const axiosFetcher = (url: string) => axios.get(url).then(res => res.data);

interface GalleryProps {
  limitItems?: number;
  showViewAll?: boolean;
}
export default function Gallery({ limitItems, showViewAll }: GalleryProps) {
  const searchParams = useSearchParams();
  const showCreditsParam = searchParams.get('showCredits');
  const router = useRouter();
  
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  
  // Set showCreditPurchase to true if showCredits query parameter is present
  useEffect(() => {
    if (showCreditsParam === 'true') {
      setShowCreditPurchase(true);
      
      // Scroll to the credits section
      setTimeout(() => {
        const creditsSection = document.getElementById('credits-section');
        if (creditsSection) {
          creditsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [showCreditsParam]);
  
  // Use SWR to fetch videos and automatically revalidate
  const { 
    data: videos, 
    error,
    isLoading, 
    mutate // Function to manually trigger revalidation or update local cache
  } = useSWR<Video[]>(
    '/api/videos', 
    axiosFetcher,
    { 
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true, // Revalidate when window gets focus
      revalidateOnReconnect: true, // Revalidate on reconnect
    }
  );
  
  // Use SWR to fetch user info including credits
  const {
    data: userData,
    error: userDataError,
  } = useSWR('/api/user', axiosFetcher);
  
  // Only show up to limitItems if specified
  const displayedVideos = Array.isArray(videos)
    ? typeof limitItems === 'number'
      ? videos.slice(0, limitItems)
      : videos
    : [];
  
  // User credits (default to 0 if not loaded yet)
  const userCredits = userData?.credits || 0;

  // Poll for videos still in processing state
  useEffect(() => {
    if (!videos?.length) return;
    
    // Find videos with processing status
    const processingVideos = videos.filter(video => video.status === 'processing');
    
    if (processingVideos.length === 0) return;
    
    // Set up polling for each processing video
    const pollingTimers: NodeJS.Timeout[] = [];
    
    processingVideos.forEach(video => {
      const timer = setInterval(async () => {
        try {
          // Call the check-status API for this video
          await axios.get(`/api/check-status?videoId=${video.id}`);
          // After call, let's refresh the main videos list
          mutate();
        } catch (err) {
          console.error(`Error polling video ${video.id}:`, err);
          // Avoid notification spam
        }
      }, 5000); // Check every 5 seconds
      
      pollingTimers.push(timer);
    });
    
    // Cleanup on unmount or when videos list changes
    return () => {
      pollingTimers.forEach(timer => clearInterval(timer));
    };
  }, [videos, mutate]);

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    // Optimistically update the UI by removing the video from the local cache
    const optimisticData = videos?.filter(v => v.id !== videoId);
    mutate(optimisticData, false); // Update local data, don't revalidate yet

    toast.loading('Deleting video...', { id: `delete-${videoId}` });

    try {
      await axios.delete(`/api/videos?id=${videoId}`);
      toast.dismiss(`delete-${videoId}`);
      toast.success('Video deleted successfully');
    } catch (err) {
      console.error("Failed to delete video:", err);
      toast.dismiss(`delete-${videoId}`);
      toast.error('Failed to delete video.');
      // Revert the optimistic update on failure
      mutate(videos, false); // Revert to original data without revalidating
    }
  };

  const openVideoDetail = (video: Video) => {
    console.log("Opening video detail:", video);
    setSelectedVideo(video);
    setIsModalOpen(true);
    
    // Debug: Force show notification to verify click is working
    toast.success("Opening video detail view");
    
    // Wait a moment then check if modal state is correct
    setTimeout(() => {
      console.log("Checking modal state after timeout:", { isModalOpen, selectedVideo });
    }, 500);
  };

  const closeVideoDetail = () => {
    console.log("Closing video detail");
    setIsModalOpen(false);
    toast.success("Closed video detail view");
  };

  // Handle video regeneration
  const handleRegenerate = async (prompt: string, imageUrl: string) => {
    // Check if user has enough credits
    if (userCredits <= 2) {
      toast.error('You need at least 3 credits to generate a video. Please purchase credits.');
      return;
    }
    
    toast.loading('Starting regeneration...', { id: 'regenerate' });
    
    try {
      // Generate the video with our backend API using the existing prompt and image
      await axios.post('/api/generate-video', {
        imageUrl,
        prompt
      });
      
      // Reload videos after initiating regeneration
      mutate();
      
      toast.dismiss('regenerate');
      toast.success('Video regeneration started! Check your gallery in a minute.');
    } catch (error) {
      toast.dismiss('regenerate');
      
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        toast.error('Insufficient credits. Please purchase more credits to generate videos.');
      } else {
        console.error('Error regenerating video:', error);
        toast.error('Failed to regenerate video. Please try again later.');
        throw error; // Rethrow to be handled by the modal
      }
    }
  };

  // Add a console log to show current state
  console.log("Modal state:", { isModalOpen, selectedVideo });

  return (
    <>
      <div className="space-y-6">
        {/* Credit status and purchase UI */}
        <div id="credits-section" className="bg-[#1A1A1D] rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap size={20} className="text-[#3EFFE2]" />
              {userDataError ? (
                <span className="text-red-400 text-sm">Error loading credits</span>
              ) : (
                <span className="font-medium text-white">{userCredits} credits available</span>
              )}
            </div>
            <button
              onClick={() => setShowCreditPurchase(!showCreditPurchase)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition"
            >
              {showCreditPurchase ? 'Hide' : 'Buy Credits'}
            </button>
          </div>
          
          {/* Credit purchase UI (conditionally shown) */}
          {showCreditPurchase && (
            <div className="mt-4">
              <CreditPurchase 
                userCredits={userCredits} 
              />
            </div>
          )}
        </div>
        
        {/* Gallery container */}
        <div className="bg-[#1A1A1D] rounded-2xl p-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Your GIF Gallery</h2>
            {/* Refresh button can still manually trigger revalidation if needed */}
            <button
              onClick={() => mutate()} // Manually trigger revalidation
              disabled={isLoading} // Disable while loading/revalidating
              className="p-1 rounded-full text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-50"
              title="Refresh Gallery"
            >
              <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {isLoading && !videos && <p className="text-gray-400">Loading videos...</p>} {/* Show loading only on initial load */} 
          {error && <p className="text-red-400 flex items-center gap-2"><AlertTriangle size={18}/> Failed to load videos.</p>}

          {!isLoading && !error && videos && videos.length === 0 && (
            <p className="text-gray-400">You haven&apos;t generated any videos yet, or they are still processing.</p>
          )}

              {displayedVideos.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => openVideoDetail(video)}
                  className="relative group cursor-pointer overflow-hidden rounded-2xl bg-[#1A1A1D]"
                >
                  {/* Display based on status */} 
                  {video.status === 'completed' && video.imageUrl ? (
                      <div className="relative group aspect-video w-full">
                        {/* Image thumbnail shown by default */}
                        <Image
                          src={video.imageUrl!}
                          alt={video.prompt}
                          fill
                          className="object-cover"
                        />
                        
                        {/* Overlay with maximize icon for opening detail view */}
                        <div 
                          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            openVideoDetail(video);
                          }}
                        >
                          <Maximize2 className="text-white" size={24} />
                        </div>
                      </div>
          ) : video.status === 'processing' ? (
                    <div className="aspect-video flex flex-col items-center justify-center text-gray-400 bg-[#1A1A1D] rounded-2xl">
                        <RefreshCw size={24} className="animate-spin text-[#3EFFE2] mb-2" />
                        <span className="text-gray-400">Processing...</span>
                        {video.imageUrl && (
                            <Image src={video.imageUrl} alt="Input Image" width={64} height={64} className="mt-2 rounded opacity-50"/>
                        )}
                    </div>
                  ) : (
                    <div className="aspect-video flex flex-col items-center justify-center text-red-400 bg-[#1A1A1D] rounded-2xl">
                       <AlertTriangle size={24} className="text-red-400 mb-2"/>
                       <span className="text-red-400">Failed</span>
                       {video.imageUrl && (
                            <Image src={video.imageUrl} alt="Input Image" width={64} height={64} className="mt-2 rounded opacity-50"/>
                        )}
                    </div>
                  )}

                  {/* Info Overlay */}
                  {!showViewAll && (
                      <div className="p-3 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-sm text-white truncate font-semibold" title={video.prompt}>{video.prompt}</p>
                      </div>
                  )}

                  {/* Delete Button (appears on hover) */} 
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening the modal when clicking delete button
                      handleDelete(video.id);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Delete GIF"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {showViewAll && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => router.push('/gallery')}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition"
              >
                View all GIFs
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Detail Modal - moved outside the main container */}
      <VideoDetailModal
        video={selectedVideo}
        videos={videos || []}
        isOpen={isModalOpen}
        onClose={closeVideoDetail}
        onDelete={handleDelete}
        onRegenerate={handleRegenerate}
        onNavigate={(vid) => setSelectedVideo(vid)}
      />
    </>
  );
} 