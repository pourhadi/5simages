import React, { Suspense } from 'react';
import Gallery from '@/components/Gallery';

export default function GalleryPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-white">Your GIF Gallery</h1>
      <Suspense fallback={<p className="text-gray-400">Loading gallery...</p>}>
        <Gallery />
      </Suspense>
    </div>
  );
}