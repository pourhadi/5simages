'use client';

import { useState } from 'react';
import axios from 'axios';
import { CreditCard, Package, Zap, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreditPurchaseProps {
  userCredits: number;
  onPurchaseComplete?: () => void; // Make optional since we're redirecting
}

interface CreditPackage {
  id: string;
  credits: number;
  price: number;
  popular?: boolean;
}

export default function CreditPurchase({ userCredits }: CreditPurchaseProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  
  // Define credit packages
  const creditPackages: CreditPackage[] = [
    { id: 'credits_3', credits: 3, price: 75 }, // $0.75
  ];
  
  const handlePurchase = async () => {
    if (!selectedPackage) {
      toast.error('Please select a credit package');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call the Stripe checkout API
      const response = await axios.post('/api/checkout', {
        packageId: selectedPackage
      });
      
      if (response.data.url) {
        // Redirect to Stripe checkout page
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error initiating checkout:', error);
      toast.error('Failed to process payment request. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Format price as currency
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price / 100);
  };
  
  return (
    <div className="bg-gray-800 shadow-md rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Purchase Credits</h2>
        <div className="flex items-center gap-2 bg-gray-700 px-3 py-1 rounded-full">
          <Zap size={16} className="text-[#FF7733]" />
          <span className="font-medium text-white">{userCredits} credits</span>
        </div>
      </div>
      
      <p className="text-gray-300 mb-6">
        Credits are used to generate videos from your images. Each video generation costs 3 credits.
        Select a package below to purchase credits.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {creditPackages.map((pkg) => (
          <div 
            key={pkg.id}
            className={`border rounded-lg p-4 relative cursor-pointer transition-all ${
              selectedPackage === pkg.id 
                ? 'border-[#FF7733] ring-2 ring-[#FF7733]/30 bg-gray-700' 
                : 'border-gray-600 hover:border-gray-500 hover:bg-gray-700/70 bg-gray-700/50'
            }`}
            onClick={() => setSelectedPackage(pkg.id)}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#FF7733] text-white text-xs px-2 py-1 rounded-full">
                Popular
              </div>
            )}
            
            {selectedPackage === pkg.id && (
              <div className="absolute top-2 right-2">
                <Check size={18} className="text-[#FF7733]" />
              </div>
            )}
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-white text-lg">{pkg.credits} Credits</h3>
                <p className="text-sm text-gray-400">{formatPrice(pkg.price)}</p>
              </div>
              <Package size={24} className={selectedPackage === pkg.id ? "text-[#FF7733]" : "text-gray-400"} />
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              {formatPrice(pkg.price / pkg.credits)} per credit
            </div>
            
            <div className="mt-3 text-xs text-gray-300 bg-gray-800/50 p-2 rounded">
              Generate {pkg.credits} videos from your images
            </div>
          </div>
        ))}
      </div>
      
      <button
        className="flex items-center justify-center gap-2 w-full bg-[#FF7733] hover:bg-[#E05E20] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handlePurchase}
        disabled={isLoading || !selectedPackage}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={18} />
            Processing...
          </>
        ) : (
          <>
            <CreditCard size={18} />
            Proceed to Checkout
          </>
        )}
      </button>
      
      <p className="text-xs text-gray-400 text-center mt-4">
        Secure payment processing with Stripe. You will be redirected to complete your purchase.
      </p>
      <p className="text-xs text-gray-400 text-center mt-2">
        After payment, credits will be added to your account automatically.
      </p>
    </div>
  );
} 