'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Download, RefreshCw } from 'lucide-react';
import { parseGIF, decompressFrames } from 'gifuct-js';
import toast from 'react-hot-toast';

interface GIFFrameSelectorProps {
  gifUrl: string;
  onFrameSelected: (frameImageUrl: string, frameIndex: number) => void;
  onClose: () => void;
}

export default function GIFFrameSelector({ 
  gifUrl, 
  onFrameSelected, 
  onClose
}: GIFFrameSelectorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<Array<{
    dims: { width: number; height: number };
    delay: number;
    patch: Uint8ClampedArray;
  }>>([]);
  const [imageBitmaps, setImageBitmaps] = useState<ImageBitmap[]>([]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentBitmapsRef = useRef<ImageBitmap[]>([]);

  // Load and parse GIF
  useEffect(() => {
    const loadGif = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setCurrentFrame(0);
        
        // Clean up previous data more thoroughly
        if (currentBitmapsRef.current.length > 0) {
          currentBitmapsRef.current.forEach(bitmap => {
            try {
              bitmap.close?.();
            } catch (e) {
              console.warn('Error closing bitmap:', e);
            }
          });
          currentBitmapsRef.current = [];
        }
        
        setImageBitmaps([]);
        setFrames([]);
        
        // Reset canvas if it exists
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Clear with original dimensions first
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Reset canvas size
            canvas.width = 1;
            canvas.height = 1;
            canvas.style.width = '';
            canvas.style.height = '';
          }
        }

        console.log('Loading new GIF:', gifUrl);

        // First, get the true GIF dimensions by loading it as an image
        const gifImage = new Image();
        const imageLoadPromise = new Promise<void>((resolve, reject) => {
          gifImage.onload = () => resolve();
          gifImage.onerror = () => reject(new Error('Failed to load GIF as image'));
          gifImage.src = gifUrl;
        });
        
        // Wait for image to load to get true dimensions
        await imageLoadPromise;
        
        const trueWidth = gifImage.naturalWidth;
        const trueHeight = gifImage.naturalHeight;
        
        console.log('True GIF dimensions from image:', { trueWidth, trueHeight });

        // Fetch GIF data for frame extraction
        const response = await fetch(gifUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch GIF');
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('GIF data size:', arrayBuffer.byteLength);
        
        // Parse the GIF for frame data
        const gif = parseGIF(arrayBuffer);
        const frameData = decompressFrames(gif, true);
        console.log('Frames decompressed:', frameData.length);
        console.log('GIF logical screen:', { width: gif.lsd.width, height: gif.lsd.height });

        if (frameData.length === 0) {
          throw new Error('No frames found in GIF');
        }

        // Use the true image dimensions as our canvas size
        const canvasWidth = trueWidth;
        const canvasHeight = trueHeight;
        
        // Calculate scaling factor if needed
        const scaleX = trueWidth / gif.lsd.width;
        const scaleY = trueHeight / gif.lsd.height;
        
        console.log('Scaling factors:', { scaleX, scaleY });
        console.log('Final canvas dimensions:', { canvasWidth, canvasHeight });

        // Process frames with a simpler approach
        const bitmaps: ImageBitmap[] = [];
        
        // Create a composite canvas that will accumulate frames properly
        const compositeCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
        const compositeCtx = compositeCanvas.getContext('2d');
        if (!compositeCtx) throw new Error('Could not get composite context');
        
        // Start with transparent background
        compositeCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        for (let i = 0; i < frameData.length; i++) {
          const frame = frameData[i];
          
          // Calculate scaled positions and sizes
          const scaledLeft = Math.round(frame.dims.left * scaleX);
          const scaledTop = Math.round(frame.dims.top * scaleY);
          const scaledWidth = Math.round(frame.dims.width * scaleX);
          const scaledHeight = Math.round(frame.dims.height * scaleY);
          
          console.log(`Processing frame ${i}:`, {
            original: { left: frame.dims.left, top: frame.dims.top, width: frame.dims.width, height: frame.dims.height },
            scaled: { left: scaledLeft, top: scaledTop, width: scaledWidth, height: scaledHeight },
            disposalType: frame.disposalType,
            patchLength: frame.patch.length
          });
          
          try {
            // Handle disposal method from previous frame
            if (i > 0) {
              const prevFrame = frameData[i - 1];
              if (prevFrame.disposalType === 2) {
                // Restore to background color (clear)
                compositeCtx.clearRect(0, 0, canvasWidth, canvasHeight);
              } else if (prevFrame.disposalType === 3) {
                // Restore to previous - this is complex, for now just clear
                compositeCtx.clearRect(0, 0, canvasWidth, canvasHeight);
              }
              // For disposalType 0 and 1, we keep the previous content
            }
            
            // Only process if frame has actual data
            if (frame.patch && frame.patch.length > 0) {
              // Create ImageData from the patch
              const imageData = new ImageData(
                new Uint8ClampedArray(frame.patch),
                frame.dims.width,
                frame.dims.height
              );
              
              // Create a temporary canvas for the patch
              const patchCanvas = new OffscreenCanvas(frame.dims.width, frame.dims.height);
              const patchCtx = patchCanvas.getContext('2d');
              
              if (patchCtx) {
                patchCtx.putImageData(imageData, 0, 0);
                
                // Draw the patch onto the composite canvas at the scaled position and size
                compositeCtx.drawImage(
                  patchCanvas,
                  scaledLeft,
                  scaledTop,
                  scaledWidth,
                  scaledHeight
                );
              }
            }

            // Create bitmap from the current composite state
            const bitmap = await createImageBitmap(compositeCanvas);
            bitmaps.push(bitmap);
            console.log(`Frame ${i} processed successfully`);
            
          } catch (err) {
            console.error(`Error processing frame ${i}:`, err);
            
            // Create a minimal debug frame
            const errorCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
            const errorCtx = errorCanvas.getContext('2d');
            if (errorCtx) {
              errorCtx.fillStyle = '#FF0000';
              errorCtx.fillRect(0, 0, 50, 20);
              errorCtx.fillStyle = 'white';
              errorCtx.font = '12px Arial';
              errorCtx.fillText(`Error ${i}`, 2, 15);
            }
            const errorBitmap = await createImageBitmap(errorCanvas);
            bitmaps.push(errorBitmap);
          }
        }

        if (bitmaps.length === 0) {
          throw new Error('Failed to process any frames');
        }

        console.log('All frames processed, total bitmaps:', bitmaps.length);

        setFrames(frameData);
        setImageBitmaps(bitmaps);
        currentBitmapsRef.current = bitmaps;
        
        console.log('Before canvas setup:', {
          hasCanvasRef: !!canvasRef.current,
          hasFirstBitmap: !!bitmaps[0],
          bitmapCount: bitmaps.length,
          canvasWidth,
          canvasHeight
        });
        
        // Ensure we have valid data before proceeding
        if (bitmaps.length === 0 || !bitmaps[0]) {
          throw new Error('No valid frames processed');
        }
        
        // Wait for canvas ref to be available
        const setupCanvas = () => {
          if (!canvasRef.current) {
            // Try again after a short delay
            setTimeout(setupCanvas, 50);
            return;
          }
          const canvas = canvasRef.current;
          
          // Set canvas internal dimensions to original GIF size to avoid quality loss
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          
          // Calculate display size - prioritize showing the full GIF at a reasonable size
          const maxDisplayWidth = Math.min(window.innerWidth * 0.7, 800);
          const maxDisplayHeight = Math.min(window.innerHeight * 0.55, 600); // Increased height allowance
          
          const aspectRatio = canvasWidth / canvasHeight;
          
          // Always scale up to a reasonable viewing size
          const targetMinSize = 500; // Much larger target size
          let scaleFactor = 1;
          
          // Calculate scale factor to make the larger dimension at least targetMinSize
          const maxOriginalDimension = Math.max(canvasWidth, canvasHeight);
          if (maxOriginalDimension < targetMinSize) {
            scaleFactor = targetMinSize / maxOriginalDimension;
          }
          
          // Apply additional scaling for very small GIFs
          if (canvasWidth < 200 || canvasHeight < 200) {
            scaleFactor = Math.max(scaleFactor, 3); // At least 3x scaling for tiny GIFs
          }
          
          let displayWidth = canvasWidth * scaleFactor;
          let displayHeight = canvasHeight * scaleFactor;
          
          console.log('Scaling calculation:', {
            original: { width: canvasWidth, height: canvasHeight },
            targetMinSize,
            maxOriginalDimension,
            scaleFactor,
            scaled: { width: displayWidth, height: displayHeight }
          });
          
          // Scale down if still too large for container
          if (displayWidth > maxDisplayWidth) {
            displayWidth = maxDisplayWidth;
            displayHeight = displayWidth / aspectRatio;
          }
          
          if (displayHeight > maxDisplayHeight) {
            displayHeight = maxDisplayHeight;
            displayWidth = displayHeight * aspectRatio;
          }
          
          // Set CSS dimensions for display scaling
          canvas.style.width = `${displayWidth}px`;
          canvas.style.height = `${displayHeight}px`;
          
          console.log('Final canvas setup:', { 
            internal: { width: canvasWidth, height: canvasHeight },
            display: { width: displayWidth, height: displayHeight },
            aspectRatio,
            scaleFactor,
            maxDisplay: { width: maxDisplayWidth, height: maxDisplayHeight },
            windowSize: { width: window.innerWidth, height: window.innerHeight },
            actualCanvasStyle: { width: canvas.style.width, height: canvas.style.height }
          });
          
          // Get fresh context after resizing
          const ctx = canvas.getContext('2d');
          if (ctx) {
            console.log('Rendering first frame...');
            // Reset all canvas state
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Verify bitmap dimensions
            console.log('First bitmap dimensions:', {
              width: bitmaps[0].width,
              height: bitmaps[0].height
            });
            
            // Draw the bitmap at original size
            ctx.drawImage(bitmaps[0], 0, 0);
            setCurrentFrame(0);
            console.log('First frame rendered successfully');
          } else {
            console.error('Could not get canvas context');
          }
        };
        
        // Start the canvas setup process
        setupCanvas();
      } catch (error) {
        console.error('Error loading GIF:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load GIF');
      } finally {
        setIsLoading(false);
      }
    };

    loadGif();
  }, [gifUrl]);

  // Cleanup effect for interval
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Cleanup effect for bitmaps
  useEffect(() => {
    return () => {
      imageBitmaps.forEach(bitmap => bitmap.close?.());
    };
  }, [imageBitmaps]);

  // Render specific frame to canvas
  const renderFrame = useCallback((frameIndex: number, bitmaps?: ImageBitmap[]) => {
    const bitmapsToUse = bitmaps || imageBitmaps;
    if (!bitmapsToUse[frameIndex] || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Use nearest neighbor for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    
    // Clear the entire canvas using its current dimensions
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the bitmap at original size
    ctx.drawImage(bitmapsToUse[frameIndex], 0, 0);
    
    setCurrentFrame(frameIndex);
  }, [imageBitmaps]);

  // Handle scrubbing via slider
  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frameIndex = parseInt(event.target.value);
    renderFrame(frameIndex);
  };

  // Play/pause animation
  const togglePlayback = () => {
    if (isPlaying) {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      const avgDelay = frames.length > 0 
        ? frames.reduce((sum, frame) => sum + (frame.delay || 100), 0) / frames.length 
        : 100;
      
      playIntervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          const next = (prev + 1) % frames.length;
          renderFrame(next);
          return next;
        });
      }, avgDelay * 10); // Convert to milliseconds
      
      setIsPlaying(true);
    }
  };

  // Navigate frames
  const goToPreviousFrame = () => {
    const prevFrame = currentFrame > 0 ? currentFrame - 1 : frames.length - 1;
    renderFrame(prevFrame);
  };

  const goToNextFrame = () => {
    const nextFrame = (currentFrame + 1) % frames.length;
    renderFrame(nextFrame);
  };

  // Export current frame and upload it
  const exportCurrentFrame = async () => {
    if (!canvasRef.current) {
      toast.error('No frame to export');
      return;
    }

    try {
      toast.loading('Uploading frame...', { id: 'frame-upload' });
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasRef.current!.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 0.95);
      });

      // Upload the frame blob to get a URL
      const formData = new FormData();
      formData.append('file', blob, 'frame.png');
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload frame');
      }
      
      const { url } = await uploadResponse.json();
      
      toast.dismiss('frame-upload');
      onFrameSelected(url, currentFrame);
      toast.success(`Frame ${currentFrame + 1} ready for generation!`);
    } catch (error) {
      toast.dismiss('frame-upload');
      console.error('Error uploading frame:', error);
      toast.error('Failed to upload frame');
    }
  };

  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
        <div className="bg-[#1A1A1D] border border-red-600/20 rounded-xl p-6 max-w-md text-center">
          <div className="text-red-400 mb-4">
            <RefreshCw size={48} className="mx-auto" />
          </div>
          <h3 className="text-white text-lg font-semibold mb-2">Failed to Load GIF</h3>
          <p className="text-gray-400 text-sm mb-4">{loadError}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1D] rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-[#2A2A2D] p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-xl font-semibold">Select Frame</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2D] rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">
            Choose a frame from your GIF to generate a new animation
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-100px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw size={48} className="text-blue-400 animate-spin mx-auto mb-4" />
                <p className="text-white">Loading GIF frames...</p>
                <p className="text-gray-400 text-sm">This may take a moment</p>
              </div>
            </div>
          ) : (
            <>
              {/* Canvas Display */}
              <div className="flex justify-center bg-gray-900 rounded-xl p-4">
                <div className="flex items-center justify-center min-h-[300px] w-full">
                  <canvas
                    ref={canvasRef}
                    className="rounded-lg shadow-lg"
                    style={{ 
                      imageRendering: 'crisp-edges',
                      display: 'block',
                      border: '1px solid #374151',
                      backgroundColor: '#000'
                    }}
                  />
                </div>
              </div>

              {/* Frame Controls */}
              <div className="space-y-4">
                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={goToPreviousFrame}
                    className="p-2 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-full transition-colors"
                    title="Previous frame"
                  >
                    <SkipBack size={20} />
                  </button>
                  
                  <button
                    onClick={togglePlayback}
                    className="p-3 bg-[#FF497D] hover:bg-[#FF497D]/80 text-white rounded-full transition-colors"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                  
                  <button
                    onClick={goToNextFrame}
                    className="p-2 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-full transition-colors"
                    title="Next frame"
                  >
                    <SkipForward size={20} />
                  </button>
                </div>

                {/* Frame Scrubber */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max={frames.length - 1}
                    value={currentFrame}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-[#2A2A2D] rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #FF497D 0%, #FF497D ${(currentFrame / (frames.length - 1)) * 100}%, #2A2A2D ${(currentFrame / (frames.length - 1)) * 100}%, #2A2A2D 100%)`
                    }}
                  />
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Frame 1</span>
                    <span>Frame {currentFrame + 1} of {frames.length}</span>
                    <span>Frame {frames.length}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-6 bg-[#2A2A2D] hover:bg-[#3A3A3D] text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                
                <button
                  onClick={exportCurrentFrame}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-white rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#FF497D]/25"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Download size={20} />
                    <span>Use This Frame</span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}