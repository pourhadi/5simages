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

export default function VideoGenerator() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
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
    if (!selectedImage || !prompt.trim()) {
      toast.error('Please select an image and enter a prompt');
      return;
    }
    
    // Check if user has enough credits (requires 3 credits per GIF)
    if (userCredits < 3) {
      toast.error('You need at least 3 credits to generate a GIF. Please purchase credits.');
      return;
    }
    
    setIsGenerating(true);
    toast.loading('Uploading image... This may take a minute for larger files.', { id: 'upload' });
    
    try {
      // Create a FormData object to upload the image to Supabase
      const formData = new FormData();
      formData.append('file', selectedImage);
      
      // Upload image to storage with increased timeout (60 seconds)
      const uploadResponse = await axios.post('/api/upload', formData, {
        timeout: 60000, // 60 seconds timeout
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const imageUrl = uploadResponse.data.url;
      
      toast.dismiss('upload');
      toast.loading('Generating your video... This may take a minute or two.', { id: 'generate' });
      
      // Generate the video with our backend API
      await axios.post('/api/generate-video', {
        imageUrl,
        prompt
      });
      
      // Update credits display after successful generation
      mutateUser();
      
      // Force router refresh to update all components with new credit value
      router.refresh();
      
      toast.dismiss('generate');
      toast.success('Video generation started! Check your gallery in a minute.');
      
      // Clear the form after successful submission
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
    <div className="bg-[#1A1A1D] shadow-xl rounded-2xl p-8">
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
      
      {/* Credit info and generate button */}
      <div className="flex justify-between items-center mt-4">
        <p className="text-sm text-gray-400">
          Generating a GIF will use 3 credits.
        </p>
        <button
          onClick={generateVideo}
          disabled={!selectedImage || !prompt.trim() || isGenerating || userCredits < 3}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 text-white px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
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
      
      {userCredits < 3 && (
        <div className="mt-6 p-4 bg-[#1A1A1D] text-[#FF497D] rounded-xl text-sm border border-[#FF497D]">
          <p className="flex items-center gap-2">
            <Zap size={16} className="text-[#FF497D]" />
            <span>You need at least 3 credits to generate a GIF. Purchase credits from the gallery page.</span>
          </p>
        </div>
      )}
    </div>
  );
} 