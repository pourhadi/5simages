'use client';

import { useState, useEffect } from 'react';
import { Video } from '@prisma/client';
import { Trash2, Clock, XCircle, Eye, Calendar, Zap, Copy, Heart } from 'lucide-react';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import GIFDetailModalV2 from './GIFDetailModal';
import { GallerySkeleton } from '@/components/ui/Skeleton';

interface GalleryGridV2Props {
  videos: Video[];
  thumbnailSize: 'small' | 'medium' | 'large';
  isLoading: boolean;
  onTweak: (prompt: string, imageUrl: string) => void;
  onRegenerate: (prompt: string, imageUrl: string, originalType: string) => void;
  onMutate: () => void;
  isGeneratorOpen?: boolean;
}

interface GroupedVideos {
  date: string;
  videos: Video[];
}

export default function GalleryGridV2({ 
  videos, 
  thumbnailSize,
  isLoading, 
  onTweak,
  onRegenerate, 
  onMutate,
  isGeneratorOpen 
}: GalleryGridV2Props) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [preloadedGifs, setPreloadedGifs] = useState<Record<string, boolean>>({});

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
          onMutate();
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
  }, [videos, onMutate]);

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this GIF?')) {
      return;
    }

    toast.loading('Deleting GIF...', { id: `delete-${videoId}` });

    try {
      await axios.delete(`/api/videos?id=${videoId}`);
      toast.dismiss(`delete-${videoId}`);
      toast.success('GIF deleted successfully');
      onMutate();
    } catch (err) {
      console.error('Failed to delete video:', err);
      toast.dismiss(`delete-${videoId}`);
      toast.error('Failed to delete GIF');
    }
  };

  const handleCopyPrompt = async (prompt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('Prompt copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      toast.error('Failed to copy prompt');
    }
  };

  const handleToggleLike = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await axios.post(`/api/videos/${videoId}/like`);
      if (response.data.success) {
        onMutate(); // Refresh the videos list
        toast.success(response.data.video.isLiked ? 'GIF liked!' : 'GIF unliked');
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      toast.error('Failed to update like status');
    }
  };

  const openDetail = (video: Video) => {
    setSelectedVideo(video);
    setIsModalOpen(true);
  };

  const handleMouseEnter = (video: Video) => {
    if (video.status === 'completed' && video.gifUrl && !preloadedGifs[video.id]) {
      // Preload the GIF
      const img = new window.Image();
      img.onload = () => {
        setPreloadedGifs(prev => ({ ...prev, [video.id]: true }));
        setHoveredVideo(video.id);
      };
      img.src = video.gifUrl;
    } else if (video.gifUrl && preloadedGifs[video.id]) {
      setHoveredVideo(video.id);
    }
  };

  const handleMouseLeave = () => {
    setHoveredVideo(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock size={16} className="text-blue-400 animate-pulse" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  if (isLoading) {
    return <GallerySkeleton thumbnailSize={thumbnailSize} count={8} />;
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-24 h-24 mx-auto bg-[#1A1A1D] rounded-3xl flex items-center justify-center mb-6">
          <Image 
            src="/logo.png" 
            alt="No GIFs" 
            width={48} 
            height={48} 
            className="opacity-50" 
          />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">No GIFs Found</h3>
        <p className="text-gray-400 mb-6">
          Start creating your first AI-powered animation!
        </p>
      </div>
    );
  }

  // Get grid classes based on thumbnail size
  const getGridClasses = () => {
    const baseClasses = 'grid gap-6';
    
    switch (thumbnailSize) {
      case 'small':
        return `${baseClasses} grid-cols-3 sm:grid-cols-4 lg:grid-cols-5`;
      case 'medium':
        return `${baseClasses} grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
      case 'large':
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`;
      default:
        return `${baseClasses} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    }
  };

  // Should show captions based on size
  const showCaptions = thumbnailSize !== 'small';

  // Get fixed height classes based on thumbnail size
  const getHeightClasses = () => {
    switch (thumbnailSize) {
      case 'small':
        return 'h-32 sm:h-36 lg:h-40';
      case 'medium':
        return 'h-48 sm:h-52 lg:h-56';
      case 'large':
        return 'h-56 sm:h-60 lg:h-64';
      default:
        return 'h-48 sm:h-52 lg:h-56';
    }
  };

  // Group videos by date
  const groupVideosByDate = (videos: Video[]): GroupedVideos[] => {
    const groups: Record<string, Video[]> = {};
    
    videos.forEach(video => {
      const date = new Date(video.createdAt);
      const dateKey = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(video);
    });
    
    // Convert to array and sort by date (newest first)
    return Object.entries(groups)
      .map(([date, videos]) => ({ date, videos }))
      .sort((a, b) => {
        const dateA = new Date(a.videos[0].createdAt).getTime();
        const dateB = new Date(b.videos[0].createdAt).getTime();
        return dateB - dateA;
      });
  };

  const groupedVideos = groupVideosByDate(videos);

  return (
    <>
      {/* Grid View */}
      <div className="space-y-12">
        {groupedVideos.map(({ date, videos: groupVideos }) => (
          <div key={date}>
            <h3 className="text-lg font-semibold text-gray-300 mb-4">{date}</h3>
            <div className={getGridClasses()}>
              {groupVideos.map((video) => (
            <div
              key={video.id}
              className={`group relative bg-[#1A1A1D] border border-[#2A2A2D] rounded-2xl overflow-hidden hover:border-[#FF497D]/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#FF497D]/10 flex flex-col ${getHeightClasses()}`}
              onMouseEnter={() => handleMouseEnter(video)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Image/Video Display */}
              <div className={`relative flex-1 transition-all duration-300 ${
                hoveredVideo === video.id && video.gifUrl && preloadedGifs[video.id] && showCaptions
                  ? '' // Take full height when caption is hidden
                  : showCaptions ? 'flex-shrink-0' : ''
              }`}>
                {video.status === 'completed' && video.imageUrl ? (
                  <>
                    {/* Static thumbnail - always present */}
                    <Image
                      src={video.imageUrl}
                      alt={video.prompt}
                      fill
                      className={`object-cover transition-opacity duration-300 ${
                        hoveredVideo === video.id && video.gifUrl && preloadedGifs[video.id] 
                          ? 'opacity-0' 
                          : 'opacity-100'
                      }`}
                    />
                    
                    {/* Animated GIF - shows on hover */}
                    {video.gifUrl && hoveredVideo === video.id && preloadedGifs[video.id] && (
                      <Image
                        src={video.gifUrl}
                        alt={video.prompt}
                        fill
                        className="object-contain transition-opacity duration-300 opacity-100 bg-black"
                        unoptimized // Important for GIFs to animate
                      />
                    )}
                  </>
                ) : video.status === 'processing' ? (
                  <div className="w-full h-full bg-[#0D0D0E] flex items-center justify-center">
                    <Image 
                      src="/loading.gif" 
                      alt="Processing" 
                      width={120} 
                      height={120}
                      className="opacity-60"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-[#0D0D0E] flex items-center justify-center">
                    <XCircle size={48} className="text-red-400" />
                  </div>
                )}

                {/* Status Badge - Only show for processing/failed */}
                {video.status !== 'completed' && (
                  <div className={`absolute top-3 left-3 px-2 py-1 rounded-full border text-xs font-medium ${getStatusColor(video.status)}`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(video.status)}
                      <span className="capitalize">{video.status}</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleToggleLike(video.id, e)}
                      className={`p-2 ${video.isLiked ? 'bg-red-500/80 hover:bg-red-500' : 'bg-black/60 hover:bg-black/80'} text-white rounded-full transition-colors`}
                      title={video.isLiked ? "Unlike" : "Like"}
                    >
                      <Heart size={16} fill={video.isLiked ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={(e) => handleCopyPrompt(video.prompt, e)}
                      className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                      title="Copy Prompt"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(video);
                      }}
                      className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(video.id);
                      }}
                      className="p-2 bg-red-600/60 hover:bg-red-600/80 text-white rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => openDetail(video)}
                />
              </div>

              {/* Content - Hide for small thumbnails and when hovering with GIF */}
              {showCaptions && !(hoveredVideo === video.id && video.gifUrl && preloadedGifs[video.id]) && (
                <div className="p-3 flex-shrink-0 min-h-[5rem] flex flex-col justify-between">
                  <p className="text-white font-medium text-xs line-clamp-2 mb-1">
                    {video.prompt}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={10} />
                      <span className="text-xs">{new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Zap size={10} className="text-[#3EFFE2]" />
                      <span className="text-xs">{video.type === 'premium' ? '3' : video.type === 'slow' ? '1' : '2'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <GIFDetailModalV2
        video={selectedVideo}
        videos={videos}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedVideo(null);
        }}
        onDelete={handleDelete}
        onTweak={onTweak}
        onRegenerate={onRegenerate}
        onNavigate={setSelectedVideo}
        isGeneratorOpen={isGeneratorOpen}
      />
    </>
  );
}