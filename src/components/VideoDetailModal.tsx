'use client';

import { useState, useEffect } from 'react';
import { Video } from '@prisma/client';
import Image from 'next/image';
import { X, Download, Share, Clock, Copy, Check, Trash2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoDetailModalProps {
  video: Video | null;
  videos: Video[];
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (videoId: string) => Promise<void>;
  onRegenerate?: (prompt: string, imageUrl: string) => Promise<void>;
  onNavigate: (video: Video) => void;
}

export default function VideoDetailModal({ video, videos, isOpen, onClose, onDelete, onRegenerate, onNavigate }: VideoDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Prevent scrolling on the background when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);
  
  // Reset copy state
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);
  
  if (!isOpen || !video) {
    return null;
  }
  
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(video.prompt);
    setCopied(true);
    toast.success('Prompt copied to clipboard');
  };
  
  const handleDownload = async (url: string) => {
    const downloadUrl = url;
    if (!downloadUrl) return;
    
    try {
      setIsDownloading(true);
      const ext = downloadUrl ? 'gif' : 'mp4';
      
      // Create a temporary link element
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `download-${video.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('Video download started');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download video');
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleShare = async () => {
    try {
      const shareUrl = video.gifUrl || video.videoUrl;
      if (navigator.share && shareUrl) {
        await navigator.share({
          title: 'Check out my AI-generated GIF',
          text: video.prompt,
          url: shareUrl
        });
      } else {
        navigator.clipboard.writeText(shareUrl || '');
        toast.success('GIF URL copied to clipboard');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };
  
  const handleRegenerate = async () => {
    if (!video || !onRegenerate) return;
    
    try {
      console.log(video.imageUrl)
      setIsRegenerating(true);
      await onRegenerate(video.prompt, video.imageUrl);
      toast.success('Generation started');
      onClose(); // Close the modal after starting regeneration
    } catch (err) {
      console.error('Regeneration error:', err);
      toast.error('Failed to start regeneration');
    } finally {
      setIsRegenerating(false);
    }
  };
  
  const canDeleteVideo = typeof onDelete === 'function';
  const canRegenerateVideo = typeof onRegenerate === 'function';
  // Navigation logic
  const currentIndex = videos.findIndex((v) => v.id === video.id);
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo = currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;
  const handlePrev = () => { if (prevVideo) onNavigate(prevVideo); };
  const handleNext = () => { if (nextVideo) onNavigate(nextVideo); };
  
  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 flex justify-center items-start overflow-auto"
      onClick={onClose}
    >
      <div
        className="w-[95%] max-w-7xl my-8 bg-[#1A1A1D] rounded-2xl overflow-auto border border-[#2A2A2D] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top navigation bar */}
        <div className="w-full bg-[#0D0D0E] p-4 flex justify-between items-center border-b border-[#2A2A2D] flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={!prevVideo}
              className={
                `p-1 rounded-full ${prevVideo ? 'text-white hover:text-gray-200' : 'text-gray-600 cursor-not-allowed'}`
              }
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={handleNext}
              disabled={!nextVideo}
              className={
                `p-1 rounded-full ${nextVideo ? 'text-white hover:text-gray-200' : 'text-gray-600 cursor-not-allowed'}`
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            {video.status === 'processing' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-full text-xs">
                <Clock size={14} className="animate-pulse" />
                <span>Processing</span>
              </div>
            )}
            {video.status === 'failed' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 rounded-full text-xs">
                <X size={14} />
                <span>Failed</span>
              </div>
            )}
            {video.status === 'completed' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 text-green-400 rounded-full text-xs">
                <Check size={14} />
                <span>Completed</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Main content area - two-column layout on larger screens */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-visible lg:overflow-hidden">
          {/* Left column - Video */}
          <div className="w-full lg:w-1/2 flex-shrink-0 flex items-center justify-center p-6 bg-black/60 overflow-hidden">
            {video.gifUrl ? (
              <div className="relative w-full h-[55vh] flex items-center justify-center">
                        <Image
                          src={video.gifUrl!}
                          alt={video.prompt}
                          fill
                          className="object-contain shadow-2xl rounded-2xl"
                        />
              </div>
                ) : video.videoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  controls
                  autoPlay
                  loop
                  className="max-w-full max-h-[55vh] object-contain shadow-2xl rounded-2xl"
                  src={video.videoUrl}
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="bg-gray-800 p-8 rounded-lg text-center text-gray-400">
                  {video.status === 'processing' ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin w-12 h-12 border-4 border-gray-600 border-t-gray-200 rounded-full mb-4"></div>
                      <p>Your video is being processed</p>
                      <p className="text-sm mt-2 text-gray-500">This may take a few minutes</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <X size={48} className="mb-4 text-red-500" />
                      <p>Video processing failed</p>
                      <p className="text-sm mt-2 text-gray-500">Please try generating again</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Right column - Info Panel */}
          <div className="w-full lg:w-1/2 flex-1 bg-[#0D0D0E] text-white p-6 overflow-visible lg:overflow-auto">
            <div className="space-y-5">
              {/* Two column layout for info sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Prompt and Source Image */}
                <div className="space-y-5">
                  {/* Prompt Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Prompt</h4>
                    <button
                      onClick={handleCopyPrompt}
                      className="p-2 rounded-full bg-[#2A2A2D] hover:bg-[#3A3A3D] text-gray-400 hover:text-white transition-colors"
                      title="Copy prompt"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-white text-base leading-relaxed">{video.prompt}</p>
                </div>
                  
                  {/* Source Image */}
                {video.imageUrl && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Source Image</h4>
                    <div className="rounded-2xl overflow-hidden shadow-lg bg-[#2A2A2D] max-w-xs">
                      <Image
                        src={video.imageUrl}
                        alt="Source image"
                        width={200}
                        height={200}
                        className="object-cover w-full h-auto"
                      />
                    </div>
                  </div>
                )}
                </div>
                
                {/* Right Column - Details and Action Buttons */}
                <div className="space-y-5">
                  {/* Additional Metadata */}
                <div className="border border-[#2A2A2D] rounded-2xl p-4 bg-[#2A2A2D]">
                    <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Created</span>
                        <span className="text-white">{typeof video.createdAt === 'string' 
                          ? new Date(video.createdAt).toLocaleString()
                          : video.createdAt.toLocaleString()
                        }</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Credits used</span>
                        <span className="text-white flex items-center gap-1">
                          { video.type == 'fast' ? (2) : (1) }
                           {/*3 <Zap size={16} className="text-[#3EFFE2]" />*/}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                <div className="space-y-4">
                    {video.videoUrl && video.gifUrl && (
                      <>
                    <button
                      onClick={async () => { await handleDownload(video.gifUrl!)}}
                      disabled={isDownloading}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 text-white transition-all duration-300"
                    >
                      <Download size={18} />
                      <span className="font-medium">Download GIF</span>
                    </button>
                        <button
                            onClick={async () => { await handleDownload(video.videoUrl!)}}
                            disabled={isDownloading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 text-white transition-all duration-300"
                        >
                          <Download size={18} />
                          <span className="font-medium">Download Video</span>
                        </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white transition-colors"
                    >
                      <Share size={18} />
                      <span className="font-medium">Share</span>
                    </button>
                      </>
                    )}
                    
                    {/* Re-Run Generation button */}
                    {canRegenerateVideo && (
                      <button
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className={`col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 text-white transition-all duration-300 ${isRegenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <RefreshCw size={18} className={isRegenerating ? 'animate-spin' : ''} />
                        <span className="font-medium">{isRegenerating ? 'Starting...' : 'Re-Run Generation'}</span>
                      </button>
                    )}
                    
                    {/* Delete button only if onDelete is provided */}
                    {canDeleteVideo && (
                      <button
                        onClick={() => onDelete?.(video.id)}
                        className="col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all duration-300 mt-4"
                      >
                        <Trash2 size={18} />
                        <span className="font-medium">Delete GIF</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 