'use client';

import { Video } from '@prisma/client';
import Image from 'next/image';
import { X, ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

interface VideoDetailModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function VideoDetailModal({ video, isOpen, onClose }: VideoDetailModalProps) {
  // Debug logs to help troubleshoot
  console.log("VideoDetailModal props:", { isOpen, video });
  
  // Prevent scrolling on the background when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      console.log("Modal open - locking scroll");
    }
    return () => {
      document.body.style.overflow = 'auto';
      console.log("Modal closed - unlocking scroll");
    };
  }, [isOpen]);
  
  if (!isOpen || !video) {
    console.log("Not rendering modal:", { isOpen, hasVideo: !!video });
    return null;
  }

  console.log("Rendering modal content");
  
  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center overflow-hidden" 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="w-[90%] max-w-6xl max-h-[90vh] bg-black/70 rounded-lg flex flex-col overflow-hidden">
        {/* Top navigation bar */}
        <div className="w-full bg-black/60 backdrop-blur-sm p-4 flex justify-between items-center">
          <button 
            onClick={onClose}
            className="text-white flex items-center gap-2 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Gallery</span>
          </button>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left side - Video */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-6">
            {video.videoUrl && (
              <div className="relative w-full h-full flex items-center justify-center">
                <video 
                  controls 
                  autoPlay 
                  loop 
                  className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded-lg" 
                  src={video.videoUrl}
                />
              </div>
            )}
          </div>
          
          {/* Right side - Info Panel */}
          <div className="lg:w-80 bg-white/10 backdrop-blur-md text-white p-6 overflow-y-auto">
            <div className="space-y-8">
              {/* Prompt */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">PROMPT</h4>
                <p className="text-white text-lg">{video.prompt}</p>
              </div>
              
              {/* Source Image */}
              {video.imageUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">SOURCE IMAGE</h4>
                  <div className="rounded-lg overflow-hidden shadow-lg">
                    <Image 
                      src={video.imageUrl} 
                      alt="Source image" 
                      width={400} 
                      height={400}
                      className="w-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              {/* Additional Metadata */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">CREATED</h4>
                <p className="text-gray-100">
                  {new Date(video.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 