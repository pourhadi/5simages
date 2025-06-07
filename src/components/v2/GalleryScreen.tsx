'use client';

import { useState, useRef, useEffect } from 'react';
import { Video } from '@prisma/client';
import { ChevronUp, Plus, Zap, Search, Filter } from 'lucide-react';
import useSWR from 'swr';
import axios from 'axios';
import toast from 'react-hot-toast';
import GIFGeneratorV2 from './GIFGenerator';
import GalleryGridV2 from './GalleryGrid';
import CreditsPurchaseV2 from './CreditsPurchase';
import Navbar from '../Navbar';
import { UserInfoSkeleton } from '@/components/ui/Skeleton';
import { useKeyboardShortcuts, globalShortcuts } from '@/hooks/useKeyboardShortcuts';

const axiosFetcher = (url: string) => axios.get(url).then(res => res.data);

export default function GalleryScreenV2() {
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [showCreditsPurchase, setShowCreditsPurchase] = useState(false);
  const [thumbnailSize, setThumbnailSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [regenerationPrefill, setRegenerationPrefill] = useState<{ prompt: string; imageUrl: string } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  
  // Ref to track the gallery position for smooth scrolling
  const galleryRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...globalShortcuts.newGif,
      callback: () => setIsGeneratorOpen(true),
    },
    {
      ...globalShortcuts.search,
      callback: () => searchInputRef.current?.focus(),
    },
    {
      ...globalShortcuts.credits,
      callback: () => setShowCreditsPurchase(true),
    },
    {
      ...globalShortcuts.help,
      callback: () => setShowShortcutsHelp(true),
    },
    {
      ...globalShortcuts.escape,
      callback: () => {
        if (showShortcutsHelp) setShowShortcutsHelp(false);
        else if (showCreditsPurchase) setShowCreditsPurchase(false);
        else if (isGeneratorOpen) setIsGeneratorOpen(false);
      },
    },
  ]);

  // Measure header height
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    
    // Update on component mount and whenever header content changes
    const observer = new ResizeObserver(updateHeaderHeight);
    if (headerRef.current) {
      observer.observe(headerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      observer.disconnect();
    };
  }, []);

  // Filter videos based on search and status
  const filteredVideos = (videos || []).filter(video => {
    const matchesSearch = video.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || video.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleRegeneratePopulate = (prompt: string, imageUrl: string) => {
    setRegenerationPrefill({ prompt, imageUrl });
    setIsGeneratorOpen(true);
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
    setIsGeneratorOpen(false);
    setRegenerationPrefill(null);
  };

  const handleGeneratorSuccess = () => {
    mutateVideos();
    setIsGeneratorOpen(false);
    toast.success('GIF generation started! It will appear in your gallery soon.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0E] via-[#1A1A1D] to-[#0D0D0E]">
      {/* Sticky Header with Navbar */}
      <div ref={headerRef} className="sticky top-0 z-40 bg-[#0D0D0E]/95 backdrop-blur-md">
        <Navbar />
        <div className="border-b border-[#2A2A2D] bg-[#0D0D0E]/95">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Credits */}
              {userData ? (
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
              ) : (
                <UserInfoSkeleton />
              )}

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
        </div>
      </div>

      {/* Generator Overlay */}
      {isGeneratorOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" 
          style={{ top: `${headerHeight}px` }}>
          <div className="h-full overflow-y-auto">
            <div className="bg-[#1A1A1D] border-b border-[#2A2A2D] min-h-full">
              <div className="max-w-4xl mx-auto px-6 py-6">
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-[#1A1A1D] py-2 -my-2 z-10">
                  <h2 className="text-xl font-bold text-white">Create New GIF</h2>
                  <button
                    onClick={handleCloseGenerator}
                    className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-[#2A2A2D]"
                  >
                    <ChevronUp size={20} />
                  </button>
                </div>
                <GIFGeneratorV2
                  prefill={regenerationPrefill}
                  onSuccess={handleGeneratorSuccess}
                  onPrefillConsumed={() => setRegenerationPrefill(null)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Gallery Controls */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-8">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                ref={searchInputRef}
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
            {/* Thumbnail Size */}
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
          </div>
        </div>

        {/* Gallery Content */}
        <div ref={galleryRef}>
          <GalleryGridV2
            videos={filteredVideos}
            thumbnailSize={thumbnailSize}
            isLoading={videosLoading}
            onTweak={handleRegeneratePopulate}
            onRegenerate={handleDirectRegenerate}
            onMutate={mutateVideos}
            isGeneratorOpen={isGeneratorOpen}
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

        {/* Keyboard Shortcuts Help Modal */}
        {showShortcutsHelp && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowShortcutsHelp(false)}
          >
            <div 
              className="bg-[#1A1A1D] border border-[#2A2A2D] rounded-3xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                <button
                  onClick={() => setShowShortcutsHelp(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#2A2A2D]">
                  <span className="text-gray-300">Create new GIF</span>
                  <kbd className="px-2 py-1 bg-[#2A2A2D] rounded text-white text-sm">⌘ N</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2A2A2D]">
                  <span className="text-gray-300">Search GIFs</span>
                  <kbd className="px-2 py-1 bg-[#2A2A2D] rounded text-white text-sm">/</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2A2A2D]">
                  <span className="text-gray-300">Buy credits</span>
                  <kbd className="px-2 py-1 bg-[#2A2A2D] rounded text-white text-sm">⌘ C</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#2A2A2D]">
                  <span className="text-gray-300">Show shortcuts</span>
                  <kbd className="px-2 py-1 bg-[#2A2A2D] rounded text-white text-sm">?</kbd>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-300">Close modal</span>
                  <kbd className="px-2 py-1 bg-[#2A2A2D] rounded text-white text-sm">ESC</kbd>
                </div>
              </div>
              
              <p className="text-xs text-gray-400 mt-4 text-center">
                Press any shortcut to try it out!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}