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
    <div className="bg-[#1A1A1D] shadow-xl rounded-2xl p-6 text-center">
      <h2 className="text-2xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
        You are out of credits!
      </h2>
      <p className="text-gray-400 mb-6">
        Please buy more credits to continue generating videos.
      </p>
      <button
        onClick={handleBuyCredits}
        className="w-full max-w-xs mx-auto py-3 px-6 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition"
      >
        Buy Credits
      </button>
    </div>
  );
} 