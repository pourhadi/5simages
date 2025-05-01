import React, { Suspense } from 'react';
import Gallery from '@/components/Gallery';

export default function GalleryPage() {
  return (
    <div>
      <Suspense fallback={<p className="text-gray-400">Loading gallery...</p>}>
        <div className="rounded-2xl">
          <Gallery />
        </div>
      </Suspense>
    </div>
  );
}