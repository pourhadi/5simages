'use client';

import { useState, useRef } from 'react';
import { Video } from '@prisma/client';
import { ChevronUp, Plus, Grid3X3, List, Zap, Search, Filter } from 'lucide-react';
import useSWR from 'swr';
import axios from 'axios';
import toast from 'react-hot-toast';
import GIFGeneratorV2 from './GIFGenerator';
import GalleryGridV2 from './GalleryGrid';
import CreditsPurchaseV2 from './CreditsPurchase';

const axiosFetcher = (url: string) => axios.get(url).then(res => res.data);

export default function GalleryScreenV2() {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [showCreditsPurchase, setShowCreditsPurchase] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [thumbnailSize, setThumbnailSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [regenerationPrefill, setRegenerationPrefill] = useState<{ prompt: string; imageUrl: string } | null>(null);
  
  // Ref to track the gallery position for smooth scrolling
  const galleryRef = useRef<HTMLDivElement>(null);

  // Fetch user data and videos
  const { data: userData } = useSWR('/api/user', axiosFetcher);
  const { 
    data: videos, 
    mutate: mutateVideos,
    isLoading: videosLoading 
  } = useSWR<Video[]>('/api/videos', axiosFetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  const userCredits = userData?.credits || 0;

  // Filter videos based on search and status
  const filteredVideos = (videos || []).filter(video => {
    const matchesSearch = video.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || video.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleRegeneratePopulate = (prompt: string, imageUrl: string) => {
    setRegenerationPrefill({ prompt, imageUrl });
    setIsGeneratorOpen(true);
    
    // Scroll to the top of the page where the generator will be
    setTimeout(() => {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }, 100); // Small delay to ensure the generator is rendered
  };

  const handleDirectRegenerate = async (prompt: string, imageUrl: string, originalType: string) => {
    try {
      const response = await axios.post('/api/generate-video', {
        imageUrl,
        prompt,
        generationType: originalType, // Use the original type (fast/slow)
        enhancePrompt: false, // No prompt enhancement for direct regeneration
      });

      if (response.status === 200) {
        mutateVideos(); // Refresh the videos list
        toast.success('Direct regeneration started! Your new GIF will appear in the gallery soon.');
      }
    } catch (error: unknown) {
      console.error('Direct regeneration failed:', error);
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        toast.error('Insufficient credits for regeneration');
      } else {
        toast.error('Failed to start regeneration. Please try again.');
      }
    }
  };

  const handleCloseGenerator = () => {
    // Scroll to gallery section smoothly when closing generator
    if (galleryRef.current) {
      galleryRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
    setIsGeneratorOpen(false);
    setRegenerationPrefill(null);
  };

  const handleGeneratorSuccess = () => {
    mutateVideos();
    // Scroll to top of page smoothly when closing after success
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
    setIsGeneratorOpen(false);
    toast.success('GIF generation started! It will appear in your gallery soon.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0E] via-[#1A1A1D] to-[#0D0D0E]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Title and Credits */}
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2">
                Your Gallery
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1D] border border-[#2A2A2D] rounded-full">
                  <Zap size={18} className="text-[#3EFFE2]" />
                  <span className="text-white font-medium">{userCredits} credits</span>
                </div>
                <button
                  onClick={() => setShowCreditsPurchase(true)}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF497D] to-[#A53FFF] text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Buy Credits
                </button>
              </div>
            </div>

            {/* Create New Button */}
            <button
              onClick={() => setIsGeneratorOpen(!isGeneratorOpen)}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-white rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#FF497D]/25"
            >
              <Plus size={20} className={`transition-transform duration-300 ${isGeneratorOpen ? 'rotate-45' : 'rotate-0'}`} />
              <span>{isGeneratorOpen ? 'Close Generator' : 'Create New GIF'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Generator */}
        <div className={`mb-8 transition-all duration-500 ease-in-out ${isGeneratorOpen ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'}`}>
          {isGeneratorOpen && (
            <div className="bg-[#1A1A1D] border border-[#2A2A2D] rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create New GIF</h2>
                <button
                  onClick={handleCloseGenerator}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ChevronUp size={24} />
                </button>
              </div>
              <GIFGeneratorV2
                prefill={regenerationPrefill}
                onSuccess={handleGeneratorSuccess}
                onPrefillConsumed={() => setRegenerationPrefill(null)}
              />
            </div>
          )}
        </div>

        {/* Gallery Controls */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-8">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search your GIFs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#1A1A1D] border border-[#2A2A2D] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF497D] focus:border-transparent text-white placeholder-gray-400"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'processing' | 'failed')}
                className="pl-10 pr-8 py-3 bg-[#1A1A1D] border border-[#2A2A2D] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF497D] focus:border-transparent text-white appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-4">
            {/* Thumbnail Size (only show for grid view) */}
            {viewMode === 'grid' && (
              <div className="flex items-center gap-2 bg-[#1A1A1D] border border-[#2A2A2D] rounded-xl p-1">
                <button
                  onClick={() => setThumbnailSize('small')}
                  className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                    thumbnailSize === 'small'
                      ? 'bg-[#FF497D] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Small thumbnails (5 columns)"
                >
                  S
                </button>
                <button
                  onClick={() => setThumbnailSize('medium')}
                  className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                    thumbnailSize === 'medium'
                      ? 'bg-[#FF497D] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Medium thumbnails (4 columns)"
                >
                  M
                </button>
                <button
                  onClick={() => setThumbnailSize('large')}
                  className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                    thumbnailSize === 'large'
                      ? 'bg-[#FF497D] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Large thumbnails (3 columns)"
                >
                  L
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-[#1A1A1D] border border-[#2A2A2D] rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-[#FF497D] text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-[#FF497D] text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Content */}
        <div ref={galleryRef}>
          <GalleryGridV2
            videos={filteredVideos}
            viewMode={viewMode}
            thumbnailSize={thumbnailSize}
            isLoading={videosLoading}
            onTweak={handleRegeneratePopulate}
            onRegenerate={handleDirectRegenerate}
            onMutate={mutateVideos}
          />
        </div>

        {/* Credits Purchase Modal */}
        {showCreditsPurchase && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowCreditsPurchase(false)}
          >
            <div 
              className="bg-[#1A1A1D] border border-[#2A2A2D] rounded-3xl p-6 max-w-md w-full shadow-2xl my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#1A1A1D] py-2 -my-2">
                <h2 className="text-xl font-bold text-white">Buy Credits</h2>
                <button
                  onClick={() => setShowCreditsPurchase(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  ✕
                </button>
              </div>
              <CreditsPurchaseV2 
                currentCredits={userCredits}
                onSuccess={() => {
                  setShowCreditsPurchase(false);
                  toast.success('Credits purchased successfully!');
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}