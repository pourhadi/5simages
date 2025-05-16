'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import Image from 'next/image';
import { Upload, ImageIcon, Trash2, RefreshCw, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Define a fetcher function for SWR
const axiosFetcher = (url: string) => axios.get(url).then(res => res.data);

interface VideoGeneratorProps {
  prefill?: { prompt: string; imageUrl: string } | null;
  onPrefillConsumed?: () => void;
}

export default function VideoGenerator({ prefill = null, onPrefillConsumed }: VideoGeneratorProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  // Generation type: 'fast' for primary+fallback (2 credits), 'slow' for slow replicate-only (1 credit)
  const [generationType, setGenerationType] = useState<'fast' | 'slow'>('fast');
  // Toggle for optional prompt enhancement via llava-13b
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  // Tooltip visibility for prompt enhancement info
  const [showEnhanceTooltip, setShowEnhanceTooltip] = useState(false);

  useEffect(() => {
    if (prefill) {
      setPrompt(prefill.prompt);
      setSelectedImage(null);
      setImagePreview(prefill.imageUrl);
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  // Cost in credits for current generation type
  const cost = generationType === 'slow' ? 1 : 2;
  // Get credits from both session and API to ensure consistency
  const { data: session } = useSession();
  const { data: userData, mutate: mutateUser } = useSWR('/api/user', axiosFetcher);
  const [userCredits, setUserCredits] = useState(0);
  
  // Combine session and API data to get the most up-to-date credits
  useEffect(() => {
    // Prefer userData from API if available, fall back to session
    if (userData?.credits !== undefined) {
      setUserCredits(userData.credits);
    } else if (session?.user?.credits !== undefined) {
      setUserCredits(session.user.credits);
    }
  }, [userData, session]);

  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedImage(file);
      
      // Create a preview URL for the image
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/jpg': []
    },
    maxSize: 5 * 1024 * 1024, // 5MB max
    maxFiles: 1
  });
  
  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
  };

  const generateVideo = async () => {
    if ((!selectedImage && !imagePreview) || !prompt.trim()) {
      toast.error('Please select an image and enter a prompt');
      return;
    }

    const cost = generationType === 'slow' ? 1 : 2;
    if (userCredits < cost) {
      toast.error(`You need at least ${cost} credits to generate a GIF. Please purchase credits.`);
      return;
    }

    setIsGenerating(true);

    let imageUrlToUse: string;
    try {
      if (selectedImage) {
        toast.loading('Uploading image... This may take a minute for larger files.', { id: 'upload' });
        const formData = new FormData();
        formData.append('file', selectedImage);

        const uploadResponse = await axios.post('/api/upload', formData, {
          timeout: 60000,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imageUrlToUse = uploadResponse.data.url;
        toast.dismiss('upload');
      } else {
        imageUrlToUse = imagePreview!;
      }

      toast.loading('Generating your video... This may take a minute or two.', { id: 'generate' });
      await axios.post('/api/generate-video', {
        imageUrl: imageUrlToUse,
        prompt,
        generationType,
        enhancePrompt,
      });

      mutateUser();
      router.refresh();

      toast.dismiss('generate');
      toast.success('Video generation started! Check your gallery in a minute.');

      handleRemoveImage();
      setPrompt('');
    } catch (error) {
      toast.dismiss('upload');
      toast.dismiss('generate');

      if (axios.isAxiosError(error) && error.response?.status === 402) {
        toast.error('Insufficient credits. Please purchase more credits to generate GIFs.');
      } else {
        console.error('Error generating video:', error);
        toast.error('Failed to generate video. Please try again later.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    // <div className="bg-[#1A1A1D] shadow-xl rounded-2xl p-8">
    <div className="bg-container shadow-xl rounded-container p-8">
      {/* Header with title and credit info */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Generate GIF</h2>
        <div className="flex items-center gap-2 bg-[#0D0D0E] px-4 py-2 rounded-full">
          <Zap size={16} className="text-[#3EFFE2]" />
          <span className="font-semibold text-white">{userCredits} credits</span>
        </div>
      </div>
      
      {/* Image dropzone */}
      {!imagePreview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 mb-6 text-center cursor-pointer transition-colors duration-300 ${
            isDragActive ? 'border-[#FF497D] bg-[#0D0D0E]' : 'border-gray-600 bg-[#0D0D0E] hover:border-[#FF497D]'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            <Upload className="text-gray-400 mb-3" size={36} />
            {isDragActive ? (
              <p className="text-[#FF497D] font-medium">Drop your image here</p>
            ) : (
              <>
                <p className="text-gray-300">Drag & drop an image here, or <span className="text-[#FF497D] font-medium">browse</span></p>
                <p className="text-gray-500 text-sm mt-2">JPG, PNG • Max size: 5MB</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="relative mb-4">
          <div className="rounded-lg overflow-hidden w-full aspect-video relative bg-gray-700">
            <Image 
              src={imagePreview} 
              alt="Preview" 
              fill 
              className="object-contain"
            />
          </div>
          <button 
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-600/80 hover:bg-red-700 text-white rounded-full"
            disabled={isGenerating}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
      
      {/* Prompt input */}
      <div className="mb-6">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">
          Describe your GIF
        </label>
        <textarea
          id="prompt"
          className="w-full px-4 py-3 bg-[#0D0D0E] border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3EFFE2] focus:border-transparent text-white placeholder-gray-400"
          placeholder="Describe what you want to see in the GIF..."
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        ></textarea>
      </div>
      {/* Prompt enhancement toggle */}
      <div className="flex items-center mb-6">
        <input
          type="checkbox"
          id="enhancePrompt"
          checked={enhancePrompt}
          onChange={() => setEnhancePrompt(!enhancePrompt)}
          disabled={isGenerating}
          className="h-4 w-4 text-[#3EFFE2] focus:ring-[#3EFFE2] bg-[#0D0D0E] border-gray-600 rounded"
        />
        <label htmlFor="enhancePrompt" className="ml-2 text-white text-sm flex items-center">
          Enhance prompt
          <span
            onMouseEnter={() => setShowEnhanceTooltip(true)}
            onMouseLeave={() => setShowEnhanceTooltip(false)}
            className="ml-1 text-[#3EFFE2] underline text-sm cursor-help relative"
          >
            (?)
            {showEnhanceTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg">
                Automatically generate an enhanced description of the image’s key attributes for animation, then prepend it to your prompt to help produce better GIFs.
              </div>
            )}
          </span>
        </label>
      </div>
      {/* Generation type selection */}
      <div className="mb-6">
      <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">
          Pick a mode
        </label>
        <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setGenerationType('fast')}
          disabled={isGenerating}
          className={`cursor-pointer bg-[#0D0D0E] transition-all rounded-2xl p-4 flex flex-col items-start gap-2 border ${
            generationType === 'fast'
              ? 'border-[#FF497D] shadow-xl'
              : 'border-gray-600 hover:border-gray-500 hover:bg-[#1A1A1D] hover:shadow-lg opacity-60'
          }`}
        >
          <div className="flex justify-between w-full items-center">
            <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Fast / Great</span>
            <span className="text-sm text-[#3EFFE2]">2 credits</span>
          </div>
          <span className={`text-sm ${generationType === 'fast' ? 'text-white/80' : 'text-gray-400'}`}>
            Typically takes 2-3 minutes. Great animations.
          </span>
        </button>
        <button
          type="button"
          onClick={() => setGenerationType('slow')}
          disabled={isGenerating}
          className={`cursor-pointer bg-[#0D0D0E] transition-all rounded-2xl p-4 flex flex-col items-start gap-2 border ${
            generationType === 'slow'
              ? 'border-[#FF497D] shadow-xl'
              : 'border-gray-600 hover:border-gray-500 hover:bg-[#1A1A1D] hover:shadow-lg opacity-60'
          } disabled:opacity-50`}
        >
          <div className="flex justify-between w-full items-center">
            <span className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Slow / Good</span>
            <span className="text-sm text-[#3EFFE2]">1 credit</span>
          </div>
          <span className={`text-sm ${generationType === 'slow' ? 'text-white/80' : 'text-gray-400'}`}>
            Typically takes 8-12 minutes. Good animations.
          </span>
        </button>
      </div>
      </div>
      
      {/* Credit info and generate button */}
      <div className="flex justify-between items-center mt-4">
        {/*<p className="text-sm text-gray-400">*/}
        {/*  Generating a GIF will use {generationType === 'slow' ? 1 : 2} credits.*/}
        {/*</p>*/}
        <button
          onClick={generateVideo}
          disabled={(!selectedImage && !imagePreview) || !prompt.trim() || isGenerating || userCredits < cost}
          // className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
          className="flex w-full items-center justify-center gap-2 text-white hover:text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:from-[#FF497D]/50 hover:via-[#A53FFF]/50  hover:to-[#1E3AFF]/50 px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isGenerating ? (
            <>
              <RefreshCw size={18} className="animate-spin text-[#3EFFE2]" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon size={18} />
              Generate GIF
            </>
          )}
        </button>
      </div>
      
      {(selectedImage || imagePreview) && prompt.trim() && userCredits < cost && (
        <div className="mt-6 p-4 bg-[#1A1A1D] text-[#FF497D] rounded-xl text-sm border border-[#FF497D]">
          <p className="flex items-center gap-2">
            <Zap size={16} className="text-[#FF497D]" />
            <span>You need at least {generationType === 'slow' ? 1 : 2} credits to generate a GIF. Purchase credits from the gallery page.</span>
          </p>
        </div>
      )}
    </div>
  );
} 