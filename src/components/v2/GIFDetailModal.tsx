'use client';

import { useState, useEffect } from 'react';
import { Video } from '@prisma/client';
import { 
  X, Download, Share, Copy, Check, Trash2, RefreshCw, 
  ChevronLeft, ChevronRight, Zap, Clock,
  CheckCircle, XCircle
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface GIFDetailModalV2Props {
  video: Video | null;
  videos: Video[];
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (videoId: string) => Promise<void>;
  onRegenerate?: (prompt: string, imageUrl: string) => void;
  onNavigate: (video: Video) => void;
}

export default function GIFDetailModalV2({
  video,
  videos,
  isOpen,
  onClose,
  onDelete,
  onRegenerate,
  onNavigate
}: GIFDetailModalV2Props) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGifLoaded, setIsGifLoaded] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

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

  if (!isOpen || !video) {
    return null;
  }

  const currentIndex = videos.findIndex((v) => v.id === video.id);
  const prevVideo = currentIndex > 0 ? videos[currentIndex - 1] : null;
  const nextVideo = currentIndex < videos.length - 1 ? videos[currentIndex + 1] : null;

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

  const handleRegenerate = async () => {
    if (!video || !onRegenerate) return;

    try {
      setIsRegenerating(true);
      onRegenerate(video.prompt, video.imageUrl);
      toast.success('Form populated for regeneration');
      onClose();
    } catch (err) {
      console.error('Regeneration error:', err);
      toast.error('Failed to populate regeneration form');
    } finally {
      setIsRegenerating(false);
    }
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
                  <img
                    src={video.gifUrl}
                    alt={video.prompt}
                    onLoad={() => setIsGifLoaded(true)}
                    className={`max-w-full max-h-[35vh] object-contain rounded-xl shadow-2xl ${
                      isGifLoaded ? '' : 'opacity-0'
                    } transition-opacity`}
                  />
                </div>
              ) : video.videoUrl ? (
                <video
                  controls
                  autoPlay
                  loop
                  className="max-w-full max-h-[35vh] object-contain rounded-xl shadow-2xl"
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
                    <span className="text-white text-sm font-medium">{video.type === 'fast' ? '2' : '1'}</span>
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

                  {/* Regenerate */}
                  {onRegenerate && video.status === 'completed' && (
                    <button
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#FF497D] to-[#A53FFF] text-white rounded-lg transition-opacity hover:opacity-90 text-sm col-span-2"
                    >
                      <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                      <span>{isRegenerating ? 'Starting...' : 'Re-generate'}</span>
                    </button>
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
                  <img
                    src={video.gifUrl}
                    alt={video.prompt}
                    onLoad={() => setIsGifLoaded(true)}
                    className={`max-w-full max-h-[calc(100vh-200px)] object-contain rounded-xl shadow-2xl ${
                      isGifLoaded ? '' : 'opacity-0'
                    } transition-opacity`}
                  />
                </div>
              ) : video.videoUrl ? (
                <video
                  controls
                  autoPlay
                  loop
                  className="max-w-full max-h-[calc(100vh-200px)] object-contain rounded-xl shadow-2xl"
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
                      <span className="text-white text-sm font-medium">{video.type === 'fast' ? '2' : '1'}</span>
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

                    {/* Regenerate */}
                    {onRegenerate && video.status === 'completed' && (
                      <button
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className="w-full flex items-center gap-2 p-3 bg-gradient-to-r from-[#FF497D] to-[#A53FFF] text-white rounded-lg transition-opacity hover:opacity-90 text-sm"
                      >
                        <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : ''} />
                        <span>{isRegenerating ? 'Starting...' : 'Re-generate'}</span>
                      </button>
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
                <div className="space-y-2">
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
  );
}