'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function BuyCredits() {
  const router = useRouter();

  const handleBuyCredits = () => {
    // Route to credits page
    router.push('/credits');
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 text-center">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">You are out of credits!</h2>
      <p className="text-gray-600 mb-6">
        Please buy more credits to continue generating videos.
      </p>
      <button
        onClick={handleBuyCredits}
        className="w-full max-w-xs mx-auto py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        Buy Credits
      </button>
    </div>
  );
} 