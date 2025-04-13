'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Zap, AlertCircle, CreditCard } from 'lucide-react';
import { CREDIT_PACKAGES } from '@/lib/stripe';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CreditsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[0].id);
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (status !== 'authenticated') {
      toast.error('You must be signed in to purchase credits');
      router.push('/login');
      return;
    }

    // Find the selected package
    const packageToCheckout = CREDIT_PACKAGES.find(pkg => pkg.id === selectedPackage);
    if (!packageToCheckout) {
      toast.error('Invalid package selection');
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
          packageId: selectedPackage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
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

  // Show sign-in prompt for unauthenticated users
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="text-center bg-white rounded-lg shadow-md p-8">
          <AlertCircle className="mx-auto text-amber-500 h-16 w-16 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
          <p className="text-gray-600 mb-6">
            You need to be signed in to purchase credits.
          </p>
          <Link 
            href="/login" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Purchase Credits</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Zap className="h-8 w-8 text-amber-500 mr-3" />
            <div>
              <h2 className="text-xl font-semibold">Buy Credits</h2>
              <p className="text-gray-600">Credits are used to generate videos</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {CREDIT_PACKAGES.map((pkg) => (
              <div 
                key={pkg.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPackage === pkg.id 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'hover:border-gray-300 hover:shadow'
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                <div className="flex flex-col h-full">
                  <h3 className="font-semibold text-lg">{pkg.name}</h3>
                  <div className="my-2 text-3xl font-bold">{formatPrice(pkg.price)}</div>
                  <p className="text-gray-600 text-sm mb-4">
                    {pkg.credits} credits to generate videos
                  </p>
                  <div className="mt-auto">
                    <div 
                      className={`h-5 w-5 rounded-full border-2 ml-auto ${
                        selectedPackage === pkg.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg mb-6">
            <div>
              <p className="text-gray-700 font-medium">Current balance</p>
              <p className="text-2xl font-bold">{session?.user?.credits || 0} credits</p>
            </div>
            <button
              onClick={handlePurchase}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="h-5 w-5" />
              <span>{isLoading ? 'Processing...' : 'Purchase Now'}</span>
            </button>
          </div>

          <div className="text-sm text-gray-500">
            <h3 className="font-medium text-gray-700 mb-2">How credits work:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>1 credit = 1 video generation</li>
              <li>Credits never expire</li>
              <li>Payment is processed securely through Stripe</li>
              <li>We don't store your payment information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 