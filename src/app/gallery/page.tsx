import React, { Suspense } from 'react';
import Gallery from '@/components/Gallery';

export default function GalleryPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
        Your GIF Gallery
      </h1>
      <Suspense fallback={<p className="text-gray-400">Loading gallery...</p>}>
        <div className="bg-[#1A1A1D] p-6 rounded-2xl">
          <Gallery />
        </div>
      </Suspense>
    </div>
  );
}