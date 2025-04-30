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
    { id: 'credits_3', credits: 3, price: 100 }, // $0.75
    { id: 'credits_15', credits: 15, price: 375 }, // $0.75
    { id: 'credits_30', credits: 30, price: 690 }, // $0.75
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
    <div className="bg-[#1A1A1D] shadow-xl rounded-2xl p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
          Purchase Credits
        </h2>
        <div className="flex items-center gap-2 bg-[#0D0D0E] px-3 py-1 rounded-full">
          <Zap size={16} className="text-[#3EFFE2]" />
          <span className="font-medium text-white">{userCredits} credits</span>
        </div>
      </div>
      
      <p className="text-gray-300 mb-6">
        Credits are used to generate GIFs from your images. 
        Select a package below to purchase credits.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {creditPackages.map((pkg) => (
          <div
            key={pkg.id}
            onClick={() => setSelectedPackage(pkg.id)}
            className={`cursor-pointer transition-all rounded-2xl p-4 border ${
              selectedPackage === pkg.id
                ? 'border-[#FF497D] bg-[#1A1A1D] shadow-xl'
                : 'border-gray-600 bg-[#1A1A1D]/70 hover:border-gray-500 hover:bg-[#1A1A1D] hover:shadow-lg'
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#FF497D] text-white text-xs px-2 py-1 rounded-full">
                Popular
              </div>
            )}
            
            {selectedPackage === pkg.id && (
              <div className="absolute top-2 right-2">
                <Check size={18} className="text-[#FF497D]" />
              </div>
            )}
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-white text-lg">{pkg.credits} Credits</h3>
                <p className="text-sm text-gray-400">{formatPrice(pkg.price)}</p>
              </div>
              <Package size={24} className={selectedPackage === pkg.id ? "text-[#FF497D]" : "text-gray-400"} />
            </div>
            
            <div className="text-xs text-gray-500 mt-2">
              {formatPrice(pkg.price / pkg.credits)} per credit
            </div>
            
            <div className="mt-3 text-xs text-gray-300 bg-[#1A1A1D]/50 p-2 rounded">
              Generate {pkg.credits / 3} Great GIFs, or {pkg.credits} Good GIFs
            </div>
          </div>
        ))}
      </div>
      
      <button
        onClick={handlePurchase}
        disabled={isLoading || !selectedPackage}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
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