'use client';

import { useState } from 'react';
import { Zap, CreditCard, Check, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreditsPurchaseV2Props {
  currentCredits: number;
  onSuccess?: () => void;
}

const creditPackages = [
  {
    credits: 2,
    price: 1.00,
    popular: false,
    description: 'Perfect for trying out',
    value: '2 SeedDance-1-Pro or 1 Kling v1.6 Standard GIF',
  },
  {
    credits: 10,
    price: 4.50,
    popular: true,
    description: 'Most popular choice',
    value: '10 SeedDance-1-Pro, 5 Kling v1.6, or 3 Wan 2.1/Hailuo-02 GIFs',
  },
  {
    credits: 30,
    price: 12.00,
    popular: false,
    description: 'Best value for creators',
    value: '30 SeedDance-1-Pro, 15 Kling v1.6, or 10 Wan 2.1/Hailuo-02 GIFs',
  },
];

export default function CreditsPurchaseV2({ currentCredits }: CreditsPurchaseV2Props) {
  const [isLoading, setIsLoading] = useState<number | null>(null);

  const handlePurchase = async (credits: number) => {
    setIsLoading(credits);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credits }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current Credits Display */}
      <div className="text-center p-3 bg-[#0D0D0E] border border-[#2A2A2D] rounded-xl">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Zap size={18} className="text-[#3EFFE2]" />
          <span className="text-lg font-bold text-white">{currentCredits}</span>
          <span className="text-gray-400 text-sm">credits available</span>
        </div>
        <p className="text-xs text-gray-400">
          Use credits to generate AI-powered GIFs
        </p>
      </div>

      {/* Credit Packages */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white text-center">
          Choose Your Credit Package
        </h3>
        
        <div className="space-y-3">
          {creditPackages.map((pkg) => (
            <div
              key={pkg.credits}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                pkg.popular
                  ? 'border-[#FF497D] bg-gradient-to-br from-[#FF497D]/5 to-[#A53FFF]/5'
                  : 'border-[#2A2A2D] bg-[#1A1A1D] hover:border-[#3A3A3D]'
              }`}
            >
              {/* Popular Badge */}
              {pkg.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-[#FF497D] to-[#A53FFF] px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={12} className="text-white fill-current" />
                    <span className="text-white text-xs font-medium">Most Popular</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={16} className="text-[#3EFFE2]" />
                    <span className="text-lg font-bold text-white">
                      {pkg.credits} Credits
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">{pkg.description}</p>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-white">
                    ${pkg.price}
                  </div>
                  <div className="text-xs text-gray-400">
                    ${(pkg.price / pkg.credits).toFixed(2)}/credit
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-xs text-gray-300">{pkg.value}</p>
              </div>

              <button
                onClick={() => handlePurchase(pkg.credits)}
                disabled={isLoading !== null}
                className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all duration-300 text-sm ${
                  pkg.popular
                    ? 'bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF497D]/25'
                    : 'bg-[#2A2A2D] text-white hover:bg-[#3A3A3D]'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
              >
                {isLoading === pkg.credits ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Starting checkout...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <CreditCard size={16} />
                    <span>Purchase Credits</span>
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-white">What you get:</h4>
        <div className="space-y-1.5">
          {[
            'High-quality AI-generated GIFs',
            'Multiple quality options from fast to premium',
            'Download in GIF and MP4 formats',
            'No subscription required',
            'Credits never expire'
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Check size={14} className="text-[#3EFFE2]" />
              <span className="text-gray-300 text-xs">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Note */}
      <div className="text-center pt-2">
        <p className="text-xs text-gray-400">
          🔒 Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
}