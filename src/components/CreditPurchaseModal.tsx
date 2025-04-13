'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { X, CreditCard, Zap, Loader2 } from 'lucide-react';
import { CREDIT_PACKAGES } from '@/lib/stripe';
import { CreditPackage } from '@/types/payments';
import toast from 'react-hot-toast';

interface CreditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditPurchaseModal({ isOpen, onClose }: CreditPurchaseModalProps) {
  const { status } = useSession();
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!selectedPackage) {
      toast.error('Please select a credit package');
      return;
    }

    if (status !== 'authenticated') {
      toast.error('You must be signed in to purchase credits');
      router.push('/login');
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: selectedPackage.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout page
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to process payment request');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Purchase Credits</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Credits are used to generate videos. Select a package below to purchase credits using Stripe.
          </p>

          <div className="space-y-4 mb-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedPackage?.id === pkg.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedPackage(pkg)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Zap className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <h3 className="font-medium">{pkg.name}</h3>
                      <p className="text-sm text-gray-500">{formatPrice(pkg.price)}</p>
                    </div>
                  </div>
                  <div className="h-5 w-5 rounded-full border-2 flex items-center justify-center">
                    {selectedPackage?.id === pkg.id && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handlePurchase}
            disabled={!selectedPackage || isLoading}
            className="w-full flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 animate-spin" size={20} />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2" size={20} />
                Proceed to Checkout
              </>
            )}
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center">
            Payments are processed securely through Stripe. You will be redirected to complete your purchase.
          </p>
        </div>
      </div>
    </div>
  );
} 