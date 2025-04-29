'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

// Content component for the cancel page
function CancelContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0E] p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-[#1A1A1D] rounded-2xl shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="w-16 h-16 text-[#FF497D]" />
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
            Payment Cancelled
          </h2>
          <p className="text-gray-600 text-center">
            Your credit purchase was cancelled. No payment has been processed.
          </p>
          <div className="pt-4 space-y-3">
            <Link
              href="/credits"
              className="block w-full py-3 px-6 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full py-3 px-6 border border-gray-600 text-gray-300 text-center rounded-xl hover:bg-[#1A1A1D] transition"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function CancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0D0D0E] p-4">
          <div className="w-full max-w-md p-8 bg-[#1A1A1D] rounded-2xl shadow-xl">
            <div className="flex justify-center">
              <p className="text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
} 