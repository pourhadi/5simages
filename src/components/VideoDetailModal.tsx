'use client';

import { useState, useEffect } from 'react';
import { Video } from '@prisma/client';
import Image from 'next/image';
import { X, ArrowLeft, Download, Share, Clock, Copy, Check, Zap, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoDetailModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (videoId: string) => Promise<void>;
  onRegenerate?: (prompt: string, imageUrl: string) => Promise<void>;
}

export default function VideoDetailModal({ video, isOpen, onClose, onDelete, onRegenerate }: VideoDetailModalProps) {
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
  
  const handleDownload = async () => {
    const downloadUrl = video.gifUrl || video.videoUrl;
    if (!downloadUrl) return;
    
    try {
      setIsDownloading(true);
      const ext = video.gifUrl ? 'gif' : 'mp4';
      
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
          title: 'Check out my AI-generated video',
          text: video.prompt,
          url: shareUrl
        });
      } else {
        navigator.clipboard.writeText(shareUrl || '');
        toast.success('Video URL copied to clipboard');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };
  
  const handleRegenerate = async () => {
    if (!video || !onRegenerate) return;
    
    try {
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
  
  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-[95%] max-w-7xl max-h-[95vh] bg-gray-900 rounded-xl flex flex-col overflow-hidden border border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top navigation bar */}
        <div className="w-full bg-gray-800/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-700">
          <button 
            onClick={onClose}
            className="text-gray-300 flex items-center gap-2 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">Back</span>
          </button>
          <div className="flex items-center gap-2">
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
              className="p-2 rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-white hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        {/* Main content area - horizontal split (stacked) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top section - Video */}
          <div className="w-full flex items-center justify-center p-4 lg:p-6 bg-black/50 overflow-hidden">
            {video.gifUrl ? (
              <div className="relative w-full h-[50vh] flex items-center justify-center">
                <Image
                  src={video.gifUrl!}
                  alt={video.prompt}
                  fill
                  className="object-contain shadow-2xl rounded-lg"
                />
              </div>
            ) : video.videoUrl ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  controls
                  autoPlay
                  loop
                  className="max-w-full max-h-[50vh] object-contain shadow-2xl rounded-lg"
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
          
          {/* Bottom section - Info Panel */}
          <div className="w-full bg-gray-800/50 backdrop-blur-sm text-white p-4 lg:p-6 overflow-y-auto border-t border-gray-700">
            <div className="space-y-5">
              {/* Two column layout for info sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column - Prompt and Source Image */}
                <div className="space-y-5">
                  {/* Prompt Section */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-400">PROMPT</h4>
                      <button 
                        onClick={handleCopyPrompt}
                        className="p-1.5 rounded-full bg-gray-700/50 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors"
                        title="Copy prompt"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-white text-base">{video.prompt}</p>
                  </div>
                  
                  {/* Source Image */}
                  {video.imageUrl && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">SOURCE IMAGE</h4>
                      <div className="rounded-lg overflow-hidden shadow-lg border border-gray-700 max-w-[200px]">
                        <Image 
                          src={video.imageUrl} 
                          alt="Source image" 
                          width={200} 
                          height={200}
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Right Column - Details and Action Buttons */}
                <div className="space-y-5">
                  {/* Additional Metadata */}
                  <div className="border border-gray-700 rounded-lg p-3 bg-gray-800/30">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">DETAILS</h4>
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
                          1 <Zap size={14} className="text-[#FF7733]" />
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ID</span>
                        <span className="text-gray-300 text-xs">{video.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {video.videoUrl && (
                      <>
                        <button
                          onClick={handleDownload}
                          disabled={isDownloading}
                          className="flex items-center justify-center gap-2 p-2 rounded-lg bg-[#FF7733] hover:bg-[#E05E20] text-white transition-colors"
                        >
                          <Download size={16} />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={handleShare}
                          className="flex items-center justify-center gap-2 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                        >
                          <Share size={16} />
                          <span>Share</span>
                        </button>
                      </>
                    )}
                    
                    {/* Re-Run Generation button */}
                    {canRegenerateVideo && (
                      <button
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className={`flex items-center justify-center gap-2 p-2 rounded-lg 
                          ${video.videoUrl ? 'col-span-2 mt-2' : 'col-span-2'}
                          bg-blue-600/80 hover:bg-blue-700 text-white transition-colors
                          ${isRegenerating ? 'opacity-70 cursor-not-allowed' : ''}
                        `}
                      >
                        <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                        <span>{isRegenerating ? 'Starting...' : 'Re-Run Generation'}</span>
                      </button>
                    )}
                    
                    {/* Delete button only if onDelete is provided */}
                    {canDeleteVideo && (
                      <button
                        onClick={() => onDelete?.(video.id)}
                        className="flex items-center justify-center gap-2 p-2 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white col-span-2 transition-colors mt-2"
                      >
                        <Trash2 size={16} />
                        <span>Delete Video</span>
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