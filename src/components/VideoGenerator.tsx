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
    
    // Check if user has enough credits
    if (userCredits <= 0) {
      toast.error('You need at least 1 credit to generate a video. Please purchase credits.');
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
        toast.error('Insufficient credits. Please purchase more credits to generate videos.');
      } else {
        console.error('Error generating video:', error);
        toast.error('Failed to generate video. Please try again later.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gray-800 shadow-md rounded-lg p-6">
      {/* Header with title and credit info */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Generate GIF</h2>
        <div className="flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-full">
          <Zap size={16} className="text-[#FF7733]" />
          <span className="font-medium text-white">{userCredits} credits</span>
        </div>
      </div>
      
      {/* Image dropzone */}
      {!imagePreview ? (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-[#FF7733] bg-gray-700' : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center">
            <Upload className="text-gray-400 mb-2" size={32} />
            {isDragActive ? (
              <p className="text-[#FF7733]">Drop your image here</p>
            ) : (
              <>
                <p className="text-gray-300">Drag & drop an image here, or <span className="text-[#FF7733]">browse</span></p>
                <p className="text-gray-500 text-sm mt-1">JPG, PNG • Max size: 5MB</p>
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
      <div className="mb-4">
        <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">
          Describe your GIF
        </label>
        <textarea 
          id="prompt"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7733] focus:border-transparent text-white"
          placeholder="Describe what you want to see in the GIF..."
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        ></textarea>
      </div>
      
      {/* Credit info and generate button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">
          Generating a GIF will use 1 credit.
        </p>
        <button
          onClick={generateVideo}
          disabled={!selectedImage || !prompt.trim() || isGenerating || userCredits <= 0}
          className="flex items-center justify-center gap-2 bg-[#FF7733] hover:bg-[#E05E20] text-white px-4 py-2 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
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
      
      {userCredits <= 0 && (
        <div className="mt-4 p-3 bg-yellow-900/50 text-yellow-200 rounded-md text-sm border border-yellow-800">
          <p className="flex items-center gap-2">
            <Zap size={16} />
            <span>You need credits to generate GIFs. Purchase credits from the gallery page.</span>
          </p>
        </div>
      )}
    </div>
  );
} 