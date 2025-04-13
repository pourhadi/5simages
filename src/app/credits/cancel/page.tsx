'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

// Content component for the cancel page
function CancelContent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="w-16 h-16 text-amber-500" />
          <h2 className="text-2xl font-bold text-gray-900">Payment Cancelled</h2>
          <p className="text-gray-600 text-center">
            Your credit purchase was cancelled. No payment has been processed.
          </p>
          <div className="pt-4 space-y-3">
            <Link
              href="/credits"
              className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md shadow transition duration-150"
            >
              Try Again
            </Link>
            <Link
              href="/"
              className="block w-full py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 text-center rounded-md shadow-sm transition duration-150"
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
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <div className="flex justify-center">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
} 