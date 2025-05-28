'use client';

import { useState, useEffect } from 'react';
import { Video } from '@prisma/client';
import { Trash2, Clock, XCircle, Eye, RefreshCw, Calendar, Zap } from 'lucide-react';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import GIFDetailModalV2 from './GIFDetailModal';

interface GalleryGridV2Props {
  videos: Video[];
  viewMode: 'grid' | 'list';
  thumbnailSize: 'small' | 'medium' | 'large';
  isLoading: boolean;
  onTweak: (prompt: string, imageUrl: string) => void;
  onRegenerate: (prompt: string, imageUrl: string, originalType: string) => void;
  onMutate: () => void;
}

export default function GalleryGridV2({ 
  videos, 
  viewMode, 
  thumbnailSize,
  isLoading, 
  onTweak,
  onRegenerate, 
  onMutate 
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
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <RefreshCw size={32} className="text-[#FF497D] animate-spin mx-auto" />
          <p className="text-gray-400">Loading your GIFs...</p>
        </div>
      </div>
    );
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

  return (
    <>
      {viewMode === 'grid' ? (
        /* Grid View */
        <div className={getGridClasses()}>
          {videos.map((video) => (
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
                      <span className="text-xs">{video.type === 'fast' ? '2' : '1'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group bg-[#1A1A1D] border border-[#2A2A2D] rounded-2xl p-6 hover:border-[#FF497D]/30 transition-all duration-300"
            >
              <div className="flex items-center gap-6">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-24 h-24 relative rounded-xl overflow-hidden">
                  {video.status === 'completed' && video.imageUrl ? (
                    <Image
                      src={video.imageUrl}
                      alt={video.prompt}
                      fill
                      className="object-cover"
                    />
                  ) : video.status === 'processing' ? (
                    <div className="w-full h-full bg-[#0D0D0E] flex items-center justify-center">
                      <Clock size={24} className="text-blue-400 animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-[#0D0D0E] flex items-center justify-center">
                      <XCircle size={24} className="text-red-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-medium text-lg line-clamp-1">
                      {video.prompt}
                    </h3>
                    
                    {/* Status Badge - Only show for processing/failed */}
                    {video.status !== 'completed' && (
                      <div className={`px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(video.status)}`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(video.status)}
                          <span className="capitalize">{video.status}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{new Date(video.createdAt).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Zap size={14} className="text-[#3EFFE2]" />
                      <span>{video.type === 'fast' ? '2' : '1'} credits</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openDetail(video)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-lg transition-colors text-sm"
                    >
                      <Eye size={16} />
                      <span>View Details</span>
                    </button>
                    
                    {video.status === 'completed' && (
                      <>
                        <button
                          onClick={() => onTweak(video.prompt, video.imageUrl)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#A53FFF]/10 hover:bg-[#A53FFF]/20 text-[#A53FFF] rounded-lg transition-colors text-sm"
                        >
                          <RefreshCw size={16} />
                          <span>Tweak</span>
                        </button>
                        
                        <button
                          onClick={() => onRegenerate(video.prompt, video.imageUrl, video.type)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#FF497D]/10 hover:bg-[#FF497D]/20 text-[#FF497D] rounded-lg transition-colors text-sm"
                        >
                          <RefreshCw size={16} />
                          <span>Regenerate</span>
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors text-sm"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
      />
    </>
  );
}