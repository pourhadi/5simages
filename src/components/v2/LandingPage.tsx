'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import exampleGif1 from '../../../gifs/1.gif';
import exampleGif2 from '../../../gifs/2.gif';
import exampleGif3 from '../../../gifs/flag.gif';
import Navbar from '../Navbar';

export default function LandingPageV2() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0E] via-[#1A1A1D] to-[#0D0D0E]">
      <Navbar />
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF497D]/10 via-transparent to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center space-y-8">
            {/* Main headline */}
            <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-[1.2]">
              <span className="block text-white pb-2">Bring Your</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] pb-4 overflow-visible">
                Images to Life
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Transform static photos into stunning animated GIFs with the power of AI. 
              Simply upload, describe, and watch the magic happen.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <button
                type="button"
                disabled
                title="Sign ups are currently disabled"
                className="group relative px-8 py-4 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] rounded-2xl text-white font-semibold text-lg opacity-50 cursor-not-allowed"
              >
                <span className="relative z-10">Start Creating Free</span>
              </button>

              <button
                onClick={() => router.push('/login')}
                className="px-8 py-4 border-2 border-gray-600 rounded-2xl text-gray-300 font-semibold text-lg hover:border-[#FF497D] hover:text-white transition-all duration-300"
              >
                Sign In
              </button>
            </div>

            {/* Sign-up status message */}
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1D] border border-[#2A2A2D] rounded-full">
              <div className="w-3 h-3 bg-[#FF497D] rounded-full animate-pulse"></div>
              <span className="text-[#FF497D] font-medium">New account sign ups are temporarily unavailable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Example GIFs Showcase */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See What&apos;s Possible
          </h2>
          <p className="text-xl text-gray-400">
            Real examples created by our AI
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[exampleGif1, exampleGif2, exampleGif3].map((gif, idx) => (
            <div key={idx} className="group relative">
              <div className="relative overflow-hidden rounded-3xl bg-[#1A1A1D] p-4 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-[#FF497D]/10">
                <Image
                  src={gif}
                  alt={`Example GIF ${idx + 1}`}
                  width={400}
                  height={400}
                  className="w-full h-auto rounded-2xl"
                />
                <div className="absolute inset-4 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl">
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-white font-medium">AI Generated</div>
                    <div className="text-gray-300 text-sm">From static image</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-[#1A1A1D] border-y border-[#2A2A2D]">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-400">
              Three simple steps to animate your photos
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-[#FF497D] to-[#A53FFF] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-2xl font-bold text-white">Upload Image</h3>
              <p className="text-gray-400 leading-relaxed">
                Drag and drop your photo or click to browse. We support JPG and PNG files up to 5MB.
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-[#A53FFF] to-[#1E3AFF] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-2xl font-bold text-white">Describe Motion</h3>
              <p className="text-gray-400 leading-relaxed">
                Tell our AI how you want your image to move. Be creative with your descriptions!
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-[#1E3AFF] to-[#3EFFE2] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-2xl font-bold text-white">Download GIF</h3>
              <p className="text-gray-400 leading-relaxed">
                Watch the magic happen! Download your animated GIF and share it with the world.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple Credit Pricing
          </h2>
          <p className="text-xl text-gray-400">
            Pay only for what you create
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-[#1A1A1D] border border-[#2A2A2D] rounded-3xl p-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#3EFFE2]/10 border border-[#3EFFE2]/20 rounded-full">
                <span className="text-[#3EFFE2] font-medium text-sm">⚡ SeedDance-1-Pro</span>
              </div>
              <div className="text-3xl font-bold text-white">1 Credit</div>
              <p className="text-gray-400">Fast 5s generation at 480p</p>
            </div>
          </div>

          <div className="bg-[#1A1A1D] border border-[#2A2A2D] rounded-3xl p-8 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#1E3AFF] to-[#A53FFF] rounded-full text-white text-sm font-medium">
              Recommended
            </div>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3AFF]/10 border border-[#1E3AFF]/20 rounded-full">
                <span className="text-[#1E3AFF] font-medium text-sm">⚡ Kling v1.6</span>
              </div>
              <div className="text-3xl font-bold text-white">2 Credits</div>
              <p className="text-gray-400">Balanced quality and speed</p>
            </div>
          </div>
          
          <div className="bg-[#1A1A1D] border border-[#2A2A2D] rounded-3xl p-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF497D]/10 border border-[#FF497D]/20 rounded-full">
                <span className="text-[#FF497D] font-medium text-sm">✨ Wan 2.1</span>
              </div>
              <div className="text-3xl font-bold text-white">3 Credits</div>
              <p className="text-gray-400">High quality, advanced settings</p>
            </div>
          </div>
          
          <div className="bg-[#1A1A1D] border border-[#2A2A2D] rounded-3xl p-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#A855F7]/10 border border-[#A855F7]/20 rounded-full">
                <span className="text-[#A855F7] font-medium text-sm">✨ Hailuo-02</span>
              </div>
              <div className="text-3xl font-bold text-white">3 Credits</div>
              <p className="text-gray-400">10s generation at 768p</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-[#FF497D]/10 via-[#A53FFF]/10 to-[#1E3AFF]/10 border-t border-[#2A2A2D]">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of creators bringing their images to life
          </p>
          <button
            type="button"
            disabled
            title="Sign ups are currently disabled"
            className="group relative px-8 py-4 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] rounded-2xl text-white font-semibold text-lg opacity-50 cursor-not-allowed"
          >
            <span className="relative z-10">Start Creating Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}