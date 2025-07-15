'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ImageIcon, Trash2, RefreshCw, Zap, Settings, Sparkles } from 'lucide-react';
import Image from 'next/image';
import axios from 'axios';
import toast from 'react-hot-toast';
import useSWR from 'swr';

const axiosFetcher = (url: string) => axios.get(url).then(res => res.data);

interface GIFGeneratorV2Props {
  prefill?: { prompt: string; imageUrl: string } | null;
  onSuccess?: () => void;
  onPrefillConsumed?: () => void;
}

export default function GIFGeneratorV2({ prefill, onSuccess, onPrefillConsumed }: GIFGeneratorV2Props) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<'seedance-1-pro' | 'kling-v1.6-standard' | 'wan-2.1-i2v-480p' | 'hailuo-02'>('kling-v1.6-standard');
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sampleSteps, setSampleSteps] = useState(30);
  const [sampleGuideScale, setSampleGuideScale] = useState(5);
  const [numberOfGenerations, setNumberOfGenerations] = useState(1);

  // Get user credits
  const { data: userData } = useSWR('/api/user', axiosFetcher);
  const userCredits = userData?.credits || 0;

  // Handle prefill
  useEffect(() => {
    if (prefill) {
      setPrompt(prefill.prompt);
      setSelectedImage(null);
      setImagePreview(prefill.imageUrl);
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  const costPerGeneration = 
    generationType === 'seedance-1-pro' ? 1 :
    generationType === 'kling-v1.6-standard' ? 2 :
    generationType === 'wan-2.1-i2v-480p' ? 3 :
    generationType === 'hailuo-02' ? 3 : 2;
  const totalCost = costPerGeneration * numberOfGenerations;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedImage(file);
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
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1
  });

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
  };

  const generateGIF = async () => {
    if ((!selectedImage && !imagePreview) || !prompt.trim()) {
      toast.error('Please select an image and enter a prompt');
      return;
    }

    if (userCredits < totalCost) {
      toast.error(`You need at least ${totalCost} credits to generate ${numberOfGenerations} GIF${numberOfGenerations > 1 ? 's' : ''}. Please purchase credits.`);
      return;
    }

    setIsGenerating(true);

    try {
      let imageUrlToUse: string;

      if (selectedImage) {
        toast.loading('Uploading image...', { id: 'upload' });
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

      toast.loading(`Starting ${numberOfGenerations} GIF generation${numberOfGenerations > 1 ? 's' : ''}...`, { id: 'generate' });
      
      // Submit multiple requests
      const promises = [];
      for (let i = 0; i < numberOfGenerations; i++) {
        promises.push(
          axios.post('/api/generate-video', {
            imageUrl: imageUrlToUse,
            prompt,
            generationType,
            enhancePrompt,
            ...(generationType === 'wan-2.1-i2v-480p' && {
              sampleSteps,
              sampleGuideScale,
            }),
          })
        );
      }
      
      await Promise.all(promises);
      toast.dismiss('generate');
      
      // Reset form
      handleRemoveImage();
      setPrompt('');
      setNumberOfGenerations(1);
      
      onSuccess?.();
    } catch (error) {
      toast.dismiss('upload');
      toast.dismiss('generate');

      if (axios.isAxiosError(error) && error.response?.status === 402) {
        toast.error('Insufficient credits. Please purchase more credits.');
      } else {
        console.error('Error generating GIF:', error);
        toast.error('Failed to generate GIF. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Upload Image</h3>
        
        {!imagePreview ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive 
                ? 'border-[#FF497D] bg-[#FF497D]/5' 
                : 'border-gray-600 hover:border-[#FF497D] hover:bg-[#FF497D]/5'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-3">
              <div className="w-12 h-12 bg-[#2A2A2D] rounded-xl flex items-center justify-center">
                <Upload className="text-gray-400" size={20} />
              </div>
              {isDragActive ? (
                <div>
                  <p className="text-[#FF497D] font-medium">Drop your image here</p>
                  <p className="text-gray-400 text-sm">Release to upload</p>
                </div>
              ) : (
                <div>
                  <p className="text-white font-medium">
                    Drag & drop an image here, or{' '}
                    <span className="text-[#FF497D] underline">browse</span>
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Supports JPG, PNG • Max size: 5MB
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="relative w-full max-w-xs mx-auto bg-[#0D0D0E] rounded-xl overflow-hidden">
              <Image 
                src={imagePreview} 
                alt="Preview" 
                width={300}
                height={200}
                className="w-full h-auto object-cover"
              />
              <button 
                onClick={handleRemoveImage}
                disabled={isGenerating}
                className="absolute top-2 right-2 p-1.5 bg-red-600/80 hover:bg-red-700 text-white rounded-full transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Section */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Describe the Animation</h3>
        <textarea
          className="w-full px-3 py-3 bg-[#0D0D0E] border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF497D] focus:border-transparent text-white placeholder-gray-400 resize-none text-sm"
          placeholder="Describe how you want your image to move... (e.g., 'gentle waves flowing', 'leaves rustling in the wind', 'hair flowing gracefully')"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isGenerating}
        />
        
        {/* Prompt Enhancement */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enhancePrompt}
              onChange={(e) => setEnhancePrompt(e.target.checked)}
              disabled={isGenerating}
              className="w-4 h-4 text-[#FF497D] bg-[#0D0D0E] border-gray-600 rounded focus:ring-[#FF497D]"
            />
            <span className="text-white text-sm">Auto-enhance prompt</span>
          </label>
        </div>
      </div>

      {/* Generation Mode Selection */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Generation Mode</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          <button
            type="button"
            onClick={() => setGenerationType('seedance-1-pro')}
            disabled={isGenerating}
            className={`p-6 rounded-2xl border-2 transition-all text-left ${
              generationType === 'seedance-1-pro'
                ? 'border-[#3EFFE2] bg-[#3EFFE2]/10'
                : 'border-gray-600 hover:border-[#3EFFE2]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-[#3EFFE2]" />
                <span className="font-semibold text-white text-sm">SeedDance-1-Pro</span>
              </div>
              <span className="text-[#3EFFE2] font-medium">1 credit</span>
            </div>
            <p className="text-gray-400 text-sm">
              Fast 5s generation at 480p. Great for quick experiments.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setGenerationType('kling-v1.6-standard')}
            disabled={isGenerating}
            className={`p-6 rounded-2xl border-2 transition-all text-left ${
              generationType === 'kling-v1.6-standard'
                ? 'border-[#1E3AFF] bg-[#1E3AFF]/10'
                : 'border-gray-600 hover:border-[#1E3AFF]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-[#1E3AFF]" />
                <span className="font-semibold text-white text-sm">Kling v1.6 Standard</span>
              </div>
              <span className="text-[#3EFFE2] font-medium">2 credits</span>
            </div>
            <p className="text-gray-400 text-sm">
              Balanced quality and speed. 5s at 16:9 aspect ratio.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setGenerationType('wan-2.1-i2v-480p')}
            disabled={isGenerating}
            className={`p-6 rounded-2xl border-2 transition-all text-left ${
              generationType === 'wan-2.1-i2v-480p'
                ? 'border-[#FF497D] bg-[#FF497D]/10'
                : 'border-gray-600 hover:border-[#FF497D]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[#FF497D]" />
                <span className="font-semibold text-white text-sm">Wan 2.1 i2v 480p</span>
              </div>
              <span className="text-[#3EFFE2] font-medium">3 credits</span>
            </div>
            <p className="text-gray-400 text-sm">
              High quality detailed animations. Advanced settings available.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setGenerationType('hailuo-02')}
            disabled={isGenerating}
            className={`p-6 rounded-2xl border-2 transition-all text-left ${
              generationType === 'hailuo-02'
                ? 'border-[#A855F7] bg-[#A855F7]/10'
                : 'border-gray-600 hover:border-[#A855F7]/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-[#A855F7]" />
                <span className="font-semibold text-white text-sm">Hailuo-02</span>
              </div>
              <span className="text-[#3EFFE2] font-medium">3 credits</span>
            </div>
            <p className="text-gray-400 text-sm">
              10s generation at 768p. Longer duration videos.
            </p>
          </button>
        </div>
      </div>

      {/* Number of Generations */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Number of Generations</h3>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setNumberOfGenerations(Math.max(1, numberOfGenerations - 1))}
            disabled={isGenerating || numberOfGenerations <= 1}
            className="w-10 h-10 bg-[#0D0D0E] border border-gray-600 rounded-lg text-white hover:border-[#FF497D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            -
          </button>
          
          <div className="min-w-[120px] text-center">
            <span className="text-2xl font-semibold text-white">{numberOfGenerations}</span>
            <p className="text-sm text-gray-400 mt-1">
              {totalCost} credit{totalCost !== 1 ? 's' : ''} total
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => setNumberOfGenerations(Math.min(10, numberOfGenerations + 1))}
            disabled={isGenerating || numberOfGenerations >= 10 || userCredits < (costPerGeneration * (numberOfGenerations + 1))}
            className="w-10 h-10 bg-[#0D0D0E] border border-gray-600 rounded-lg text-white hover:border-[#FF497D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            +
          </button>
        </div>
        
        {numberOfGenerations > 1 && (
          <p className="text-sm text-gray-400">
            Each generation will create a unique GIF with the same image and prompt
          </p>
        )}
      </div>

      {/* Advanced Settings (Wan 2.1 Mode Only) */}
      {generationType === 'wan-2.1-i2v-480p' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-[#FF497D] hover:text-[#A53FFF] transition-colors text-sm"
          >
            <Settings size={16} />
            <span className="font-medium">
              {showAdvanced ? 'Hide' : 'Show'} Advanced
            </span>
          </button>

          {showAdvanced && (
            <div className="bg-[#0D0D0E] border border-gray-600 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Steps: {sampleSteps}
                </label>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={sampleSteps}
                  onChange={(e) => setSampleSteps(parseInt(e.target.value))}
                  disabled={isGenerating}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">
                  More steps = higher quality (30 recommended)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Guide Scale: {sampleGuideScale}
                </label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.1}
                  value={sampleGuideScale}
                  onChange={(e) => setSampleGuideScale(parseFloat(e.target.value))}
                  disabled={isGenerating}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Higher values follow prompt more closely
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      <div className="pt-2">
        <button
          onClick={generateGIF}
          disabled={(!selectedImage && !imagePreview) || !prompt.trim() || isGenerating || userCredits < totalCost}
          className="w-full py-3 px-6 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-white font-semibold rounded-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-[#FF497D]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isGenerating ? (
            <div className="flex items-center justify-center gap-2">
              <RefreshCw size={18} className="animate-spin" />
              <span>Generating {numberOfGenerations} GIF{numberOfGenerations > 1 ? 's' : ''}...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <ImageIcon size={20} />
              <span>Generate {numberOfGenerations} GIF{numberOfGenerations > 1 ? 's' : ''} ({totalCost} credit{totalCost > 1 ? 's' : ''})</span>
            </div>
          )}
        </button>

        {/* Insufficient credits warning */}
        {(selectedImage || imagePreview) && prompt.trim() && userCredits < totalCost && (
          <div className="mt-4 p-4 bg-red-600/10 border border-red-600/20 rounded-xl">
            <p className="text-red-400 text-sm text-center">
              You need {totalCost} credit{totalCost > 1 ? 's' : ''} to generate {numberOfGenerations} GIF{numberOfGenerations > 1 ? 's' : ''}. 
              You currently have {userCredits} credit{userCredits !== 1 ? 's' : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}