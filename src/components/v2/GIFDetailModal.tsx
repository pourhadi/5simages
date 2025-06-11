'use client';

import { useState, useEffect, useRef } from 'react';
import { Video } from '@prisma/client';
import { 
  X, Download, Share, Copy, Check, Trash2, RefreshCw, 
  ChevronLeft, ChevronRight, Zap, Clock,
  CheckCircle, XCircle, Scissors
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import GIFFrameSelector from './GIFFrameSelector';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface GIFDetailModalV2Props {
  video: Video | null;
  videos: Video[];
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (videoId: string) => Promise<void>;
  onTweak?: (prompt: string, imageUrl: string) => void;
  onRegenerate?: (prompt: string, imageUrl: string, originalType: string) => void;
  onNavigate: (video: Video) => void;
  isGeneratorOpen?: boolean;
}

export default function GIFDetailModalV2({
  video,
  videos,
  isOpen,
  onClose,
  onDelete,
  onTweak,
  onRegenerate,
  onNavigate,
  isGeneratorOpen
}: GIFDetailModalV2Props) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTweaking, setIsTweaking] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGifLoaded, setIsGifLoaded] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isFrameSelectorOpen, setIsFrameSelectorOpen] = useState(false);
  const miniGalleryRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen || isFullscreenOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, isFullscreenOpen]);

  // Reset copied state
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Reset gif loaded state when video changes
  useEffect(() => {
    setIsGifLoaded(false);
  }, [video?.gifUrl]);

  // Scroll mini-gallery to selected video
  useEffect(() => {
    if (isOpen && video && miniGalleryRef.current) {
      const currentIndex = videos.findIndex(v => v.id === video.id);
      if (currentIndex !== -1) {
        // Find the video element in the mini gallery
        const videoElement = miniGalleryRef.current.children[currentIndex] as HTMLElement;
        if (videoElement) {
          // Scroll the element into view with smooth behavior
          videoElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }
    }
  }, [isOpen, video, videos]);

  // Handle escape key for fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenOpen) {
        setIsFullscreenOpen(false);
      }
    };

    if (isFullscreenOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isFullscreenOpen]);

  const currentIndex = video ? videos.findIndex((v) => v.id === video.id) : -1;
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo = currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

  // Keyboard shortcuts for navigation
  useKeyboardShortcuts([
    {
      key: 'ArrowLeft',
      callback: () => isOpen && prevVideo && onNavigate(prevVideo),
    },
    {
      key: 'ArrowRight',
      callback: () => isOpen && nextVideo && onNavigate(nextVideo),
    },
    {
      key: 'Escape',
      callback: () => isOpen && onClose(),
    },
  ]);

  if (!isOpen || !video) {
    return null;
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(video.prompt);
    setCopied(true);
    toast.success('Prompt copied to clipboard');
  };

  const handleDownload = async (url: string, type: 'gif' | 'video') => {
    if (!url) return;

    try {
      setIsDownloading(true);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stillmotion-${video.id}.${type === 'gif' ? 'gif' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`${type.toUpperCase()} download started`);
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Failed to download ${type}`);
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

  const handleTweak = async () => {
    if (!video || !onTweak) return;

    try {
      setIsTweaking(true);
      onTweak(video.prompt, video.imageUrl);
      toast.success('Form populated for tweaking');
      // Don't close the modal if generator is already open
      if (!isGeneratorOpen) {
        onClose();
      }
    } catch (err) {
      console.error('Tweak error:', err);
      toast.error('Failed to populate tweak form');
    } finally {
      setIsTweaking(false);
    }
  };

  const handleDirectRegenerate = async () => {
    if (!video || !onRegenerate) return;

    try {
      setIsRegenerating(true);
      await onRegenerate(video.prompt, video.imageUrl, video.type);
      toast.success('Direct regeneration started!');
      onClose();
    } catch (err) {
      console.error('Regeneration error:', err);
      toast.error('Failed to start regeneration');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFrameTweak = (frameImageUrl: string, frameIndex: number) => {
    if (!video || !onTweak) return;

    toast.success(`Frame ${frameIndex + 1} loaded into generator!`);
    onTweak(video.prompt, frameImageUrl);
    setIsFrameSelectorOpen(false);
    onClose();
  };

  const openFrameSelector = () => {
    if (!video.gifUrl) {
      toast.error('GIF not available for frame selection');
      return;
    }
    setIsFrameSelectorOpen(true);
  };

  const handleGifClick = () => {
    if (video.gifUrl || video.videoUrl) {
      setIsFullscreenOpen(true);
    }
  };

  const handleFullscreenClose = () => {
    setIsFullscreenOpen(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
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
      case 'completed':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'processing':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/95"
        onClick={onClose}
      >
      <div
        className="w-full h-full bg-[#0D0D0E] lg:overflow-hidden overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0D0D0E] border-b border-[#2A2A2D] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => prevVideo && onNavigate(prevVideo)}
                  disabled={!prevVideo}
                  className={`p-2 rounded-full ${
                    prevVideo ? 'text-white hover:bg-[#2A2A2D]' : 'text-gray-600 cursor-not-allowed'
                  } transition-colors`}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => nextVideo && onNavigate(nextVideo)}
                  disabled={!nextVideo}
                  className={`p-2 rounded-full ${
                    nextVideo ? 'text-white hover:bg-[#2A2A2D]' : 'text-gray-600 cursor-not-allowed'
                  } transition-colors`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Status */}
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(video.status)}`}>
                <div className="flex items-center gap-2">
                  {getStatusIcon(video.status)}
                  <span className="capitalize">{video.status}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2D] rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Responsive Layout */}
        <div className="lg:flex lg:h-[calc(100vh-88px)] lg:w-full">
          {/* Mobile: Single column scroll */}
          <div className="lg:hidden space-y-4 p-4">
            {/* Horizontal Mini Gallery */}
            <div className="mb-4">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {videos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onNavigate(v)}
                    className={`flex-shrink-0 w-16 h-16 relative rounded-lg overflow-hidden border-2 transition-all ${
                      v.id === video.id
                        ? 'border-[#FF497D] ring-2 ring-[#FF497D]/20'
                        : 'border-transparent hover:border-[#2A2A2D]'
                    }`}
                  >
                    {v.imageUrl ? (
                      <Image
                        src={v.imageUrl}
                        alt={v.prompt}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0D0D0E] flex items-center justify-center">
                        {getStatusIcon(v.status)}
                      </div>
                    )}
                    {/* Current indicator */}
                    {v.id === video.id && (
                      <div className="absolute inset-0 bg-[#FF497D]/20" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            {/* GIF Display */}
            <div className="flex items-center justify-center bg-black p-4 rounded-xl min-h-[40vh]">
              {video.gifUrl ? (
                <div className="relative">
                  {!isGifLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image
                        src="/loading.gif"
                        alt="Loading"
                        width={120}
                        height={120}
                        className="opacity-60"
                      />
                    </div>
                  )}
                  <Image
                    src={video.gifUrl}
                    alt={video.prompt}
                    width={600}
                    height={400}
                    onLoad={() => setIsGifLoaded(true)}
                    onClick={handleGifClick}
                    className={`max-w-full max-h-[35vh] object-contain rounded-xl shadow-2xl cursor-pointer hover:scale-105 transition-all duration-300 ${
                      isGifLoaded ? '' : 'opacity-0'
                    }`}
                  />
                </div>
              ) : video.videoUrl ? (
                <video
                  controls
                  autoPlay
                  loop
                  onClick={handleGifClick}
                  className="max-w-full max-h-[35vh] object-contain rounded-xl shadow-2xl cursor-pointer hover:scale-105 transition-all duration-300"
                  src={video.videoUrl}
                />
              ) : (
                <div className="text-center">
                  {video.status === 'processing' ? (
                    <div className="space-y-4">
                      <RefreshCw size={48} className="text-blue-400 animate-spin mx-auto" />
                      <div>
                        <p className="text-white text-lg">Processing your GIF</p>
                        <p className="text-gray-400">This may take a few minutes</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <XCircle size={48} className="text-red-400 mx-auto" />
                      <div>
                        <p className="text-white text-lg">Generation failed</p>
                        <p className="text-gray-400">Please try again</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Details & Actions - Mobile */}
            <div className="bg-[#1A1A1D] p-4 rounded-xl space-y-4">
              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-white">Prompt</h3>
                  <button
                    onClick={handleCopyPrompt}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                    title="Copy prompt"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-white text-sm leading-relaxed bg-[#0D0D0E] p-3 rounded-lg border border-[#2A2A2D]">
                  {video.prompt}
                </p>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0D0D0E] p-3 rounded-lg border border-[#2A2A2D]">
                  <div className="text-xs text-gray-400 mb-1">Created</div>
                  <div className="text-white text-sm font-medium">
                    {new Date(video.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-[#0D0D0E] p-3 rounded-lg border border-[#2A2A2D]">
                  <div className="text-xs text-gray-400 mb-1">Credits used</div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">{video.type === 'premium' ? '3' : video.type === 'slow' ? '1' : '2'}</span>
                    <Zap size={14} className="text-[#3EFFE2]" />
                  </div>
                </div>
              </div>

              {/* Source Image */}
              {video.imageUrl && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Source Image</h4>
                  <div className="bg-[#0D0D0E] p-3 rounded-lg border border-[#2A2A2D]">
                    <Image
                      src={video.imageUrl}
                      alt="Source"
                      width={250}
                      height={180}
                      className="w-full rounded-lg object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  {/* Download buttons */}
                  {video.gifUrl && (
                    <button
                      onClick={() => handleDownload(video.gifUrl!, 'gif')}
                      disabled={isDownloading}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-lg transition-colors text-sm"
                    >
                      <Download size={16} />
                      <span>GIF</span>
                    </button>
                  )}
                  
                  {video.videoUrl && (
                    <button
                      onClick={() => handleDownload(video.videoUrl!, 'video')}
                      disabled={isDownloading}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-lg transition-colors text-sm"
                    >
                      <Download size={16} />
                      <span>Video</span>
                    </button>
                  )}

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-lg transition-colors text-sm"
                  >
                    <Share size={16} />
                    <span>Share</span>
                  </button>

                  {/* Tweak and Regenerate */}
                  {video.status === 'completed' && (onTweak || onRegenerate) && (
                    <div className="space-y-2 col-span-2">
                      {/* Frame Selection */}
                      {onTweak && video.gifUrl && (
                        <button
                          onClick={openFrameSelector}
                          className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#3EFFE2] to-[#1E3AFF] text-white rounded-lg transition-opacity hover:opacity-90 text-sm"
                        >
                          <Scissors size={16} />
                          <span>Select Frame</span>
                        </button>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        {/* Tweak */}
                        {onTweak && (
                          <button
                            onClick={handleTweak}
                            disabled={isTweaking}
                            className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#A53FFF] to-[#8B5CF6] text-white rounded-lg transition-opacity hover:opacity-90 text-sm"
                          >
                            <RefreshCw size={16} className={isTweaking ? 'animate-spin' : ''} />
                            <span>{isTweaking ? 'Opening...' : 'Tweak'}</span>
                          </button>
                        )}
                        
                        {/* Direct Regenerate */}
                        {onRegenerate && (
                          <button
                            onClick={handleDirectRegenerate}
                            disabled={isRegenerating}
                            className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#FF497D] to-[#A53FFF] text-white rounded-lg transition-opacity hover:opacity-90 text-sm"
                          >
                            <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                            <span>{isRegenerating ? 'Generating...' : 'Regenerate'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Delete */}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(video.id)}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors text-sm col-span-2"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: Three column layout */}
          <div className="hidden lg:flex lg:flex-row lg:h-full lg:w-full">
            {/* Left Column: GIF Display */}
            <div className="flex-1 flex items-center justify-center bg-black p-8">
              {video.gifUrl ? (
                <div className="relative">
                  {!isGifLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image
                        src="/loading.gif"
                        alt="Loading"
                        width={120}
                        height={120}
                        className="opacity-60"
                      />
                    </div>
                  )}
                  <Image
                    src={video.gifUrl}
                    alt={video.prompt}
                    width={600}
                    height={400}
                    onLoad={() => setIsGifLoaded(true)}
                    onClick={handleGifClick}
                    className={`max-w-full max-h-[calc(100vh-200px)] object-contain rounded-xl shadow-2xl cursor-pointer hover:scale-105 transition-all duration-300 ${
                      isGifLoaded ? '' : 'opacity-0'
                    }`}
                  />
                </div>
              ) : video.videoUrl ? (
                <video
                  controls
                  autoPlay
                  loop
                  onClick={handleGifClick}
                  className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-xl shadow-2xl cursor-pointer hover:scale-105 transition-all duration-300"
                  src={video.videoUrl}
                />
              ) : (
                <div className="text-center">
                  {video.status === 'processing' ? (
                    <div className="space-y-4">
                      <RefreshCw size={48} className="text-blue-400 animate-spin mx-auto" />
                      <div>
                        <p className="text-white text-lg">Processing your GIF</p>
                        <p className="text-gray-400">This may take a few minutes</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <XCircle size={48} className="text-red-400 mx-auto" />
                      <div>
                        <p className="text-white text-lg">Generation failed</p>
                        <p className="text-gray-400">Please try again</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Middle Column: Details & Actions */}
            <div className="w-80 border-l border-[#2A2A2D] bg-[#1A1A1D] p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Prompt */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Prompt</h3>
                    <button
                      onClick={handleCopyPrompt}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Copy prompt"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p className="text-white text-sm leading-relaxed bg-[#0D0D0E] p-3 rounded-lg border border-[#2A2A2D]">
                    {video.prompt}
                  </p>
                </div>

                {/* Metadata */}
                <div className="space-y-3">
                  <div className="bg-[#0D0D0E] p-3 rounded-lg border border-[#2A2A2D]">
                    <div className="text-xs text-gray-400 mb-1">Created</div>
                    <div className="text-white text-sm font-medium">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="bg-[#0D0D0E] p-3 rounded-lg border border-[#2A2A2D]">
                    <div className="text-xs text-gray-400 mb-1">Credits used</div>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{video.type === 'premium' ? '3' : video.type === 'slow' ? '1' : '2'}</span>
                      <Zap size={14} className="text-[#3EFFE2]" />
                    </div>
                  </div>
                </div>

                {/* Source Image */}
                {video.imageUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-white mb-3">Source Image</h4>
                    <div className="bg-[#0D0D0E] p-3 rounded-lg border border-[#2A2A2D]">
                      <Image
                        src={video.imageUrl}
                        alt="Source"
                        width={250}
                        height={180}
                        className="w-full rounded-lg object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Actions</h4>
                  <div className="space-y-2">
                    {/* Download buttons */}
                    {video.gifUrl && (
                      <button
                        onClick={() => handleDownload(video.gifUrl!, 'gif')}
                        disabled={isDownloading}
                        className="w-full flex items-center gap-2 p-3 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-lg transition-colors text-sm"
                      >
                        <Download size={16} />
                        <span>Download GIF</span>
                      </button>
                    )}
                    
                    {video.videoUrl && (
                      <button
                        onClick={() => handleDownload(video.videoUrl!, 'video')}
                        disabled={isDownloading}
                        className="w-full flex items-center gap-2 p-3 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-lg transition-colors text-sm"
                      >
                        <Download size={16} />
                        <span>Download Video</span>
                      </button>
                    )}

                    {/* Share */}
                    <button
                      onClick={handleShare}
                      className="w-full flex items-center gap-2 p-3 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-lg transition-colors text-sm"
                    >
                      <Share size={16} />
                      <span>Share</span>
                    </button>

                    {/* Frame Selection and Actions */}
                    {video.status === 'completed' && (onTweak || onRegenerate) && (
                      <>
                        {/* Frame Selection */}
                        {onTweak && video.gifUrl && (
                          <button
                            onClick={openFrameSelector}
                            className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-[#3EFFE2] to-[#1E3AFF] text-white rounded-lg transition-opacity hover:opacity-90 text-sm"
                          >
                            <Scissors size={16} />
                            <span>Select Frame</span>
                          </button>
                        )}

                        {/* Tweak */}
                        {onTweak && (
                          <button
                            onClick={handleTweak}
                            disabled={isTweaking}
                            className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-[#A53FFF] to-[#8B5CF6] text-white rounded-lg transition-opacity hover:opacity-90 text-sm"
                          >
                            <RefreshCw size={16} className={isTweaking ? 'animate-spin' : ''} />
                            <span>{isTweaking ? 'Opening...' : 'Tweak'}</span>
                          </button>
                        )}
                        
                        {/* Direct Regenerate */}
                        {onRegenerate && (
                          <button
                            onClick={handleDirectRegenerate}
                            disabled={isRegenerating}
                            className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-[#FF497D] to-[#A53FFF] text-white rounded-lg transition-opacity hover:opacity-90 text-sm"
                          >
                            <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                            <span>{isRegenerating ? 'Generating...' : 'Regenerate'}</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Delete */}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(video.id)}
                        className="w-full flex items-center gap-2 p-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Mini Gallery */}
            <div className="w-64 border-l border-[#2A2A2D] bg-[#0D0D0E] overflow-y-auto">
              <div className="p-4">
                <h4 className="text-sm font-medium text-white mb-4 sticky top-0 bg-[#0D0D0E] py-2 -my-2">
                  Your GIFs ({videos.length})
                </h4>
                <div ref={miniGalleryRef} className="space-y-2">
                  {videos.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => onNavigate(v)}
                      className={`w-full flex flex-col gap-2 p-2 rounded-lg transition-colors ${
                        v.id === video.id
                          ? 'bg-[#FF497D]/20 border border-[#FF497D]/40'
                          : 'bg-[#1A1A1D] hover:bg-[#2A2A2D] border border-transparent'
                      }`}
                    >
                      <div className="w-full aspect-video relative rounded-md overflow-hidden">
                        {v.imageUrl ? (
                          <Image
                            src={v.imageUrl}
                            alt={v.prompt}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#0D0D0E] flex items-center justify-center">
                            {getStatusIcon(v.status)}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-white text-xs line-clamp-2 mb-1">
                          {v.prompt}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(v.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Fullscreen Media Overlay */}
      {isFullscreenOpen && (video.gifUrl || video.videoUrl) && (
        <div
          className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center"
          onClick={handleFullscreenClose}
        >
          <div className="relative w-full h-full max-w-[90vw] max-h-[90vh] flex items-center justify-center p-4">
            {/* Close button */}
            <button
              onClick={handleFullscreenClose}
              className="absolute top-2 right-2 z-10 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            
            {/* Fullscreen Media */}
            {video.gifUrl ? (
              <Image
                src={video.gifUrl}
                alt={video.prompt}
                width={1200}
                height={800}
                className="w-full h-full object-contain"
                unoptimized // Important for GIFs to animate
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on GIF
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            ) : video.videoUrl ? (
              <video
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
                src={video.videoUrl}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on video
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* Frame Selector Modal */}
      {isFrameSelectorOpen && video?.gifUrl && (
        <GIFFrameSelector
          gifUrl={video.gifUrl}
          onFrameSelected={handleFrameTweak}
          onClose={() => setIsFrameSelectorOpen(false)}
        />
      )}
    </>
  );
}