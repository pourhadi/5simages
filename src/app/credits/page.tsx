'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Zap, AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { CREDIT_PACKAGES } from '@/lib/stripe';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CreditsPage() {
  const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then(res => {
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    });
  const { data: user, error: authError, isLoading: authLoading } = useSWR('/api/user', fetcher);
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState(CREDIT_PACKAGES[0].id);
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
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

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0D0D0E]">
        <Loader2 className="animate-spin h-8 w-8 text-[#3EFFE2]" />
      </div>
    );
  }

  // Show sign-in prompt for unauthenticated users
  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0E] p-4">
        <div className="bg-[#1A1A1D] rounded-2xl shadow-lg p-8 border border-gray-800 text-center w-full max-w-md">
          <AlertCircle className="mx-auto text-[#3EFFE2] h-16 w-16 mb-4" />
          <h1 className="text-3xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
            Sign In Required
          </h1>
          <p className="text-gray-300 mb-6">
            You need to be signed in to purchase credits.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
  <div className="container mx-auto max-w-4xl px-4 py-8">
    <h1 className="text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
      Purchase Credits
    </h1>
      
      <div className="bg-[#1A1A1D] rounded-2xl shadow-xl overflow-hidden border border-gray-800">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <Zap className="h-8 w-8 text-[#3EFFE2] mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-white">Buy Credits</h2>
              <p className="text-gray-300">Credits are used to generate GIFs</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`cursor-pointer transition-all rounded-2xl p-4 border ${
                  selectedPackage === pkg.id
                    ? 'border-[#FF497D] bg-[#1A1A1D] shadow-xl'
                    : 'border-gray-600 bg-[#1A1A1D]/70 hover:border-gray-500 hover:bg-[#1A1A1D] hover:shadow-lg'
                }`}
              >
                <div className="flex flex-col h-full">
                  <h3 className="font-semibold text-lg text-white">{pkg.name}</h3>
                  <div className="my-2 text-3xl font-bold text-white">{formatPrice(pkg.price)}</div>
                  <p className="text-gray-300 text-sm mb-4">
                    {pkg.credits} credits to generate GIFs
                  </p>
                  <div className="mt-auto">
                    <div
                      className={`h-5 w-5 rounded-full border-2 ml-auto ${
                        selectedPackage === pkg.id ? 'border-[#FF497D] bg-[#FF497D]' : 'border-gray-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center p-4 bg-[#0D0D0E]  rounded-lg mb-6">
            <div>
              <p className="text-gray-300 font-medium">Current balance</p>
            <p className="text-2xl font-bold text-white">{user?.credits || 0} credits</p>
            </div>
            <button
              onClick={handlePurchase}
              disabled={isLoading}
              className="px-6 py-3 rounded-xl text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="h-5 w-5" />
              <span>{isLoading ? 'Processing...' : 'Purchase Now'}</span>
            </button>
          </div>

          <div className="text-sm text-gray-300">
            <h3 className="font-medium text-gray-200 mb-2">How credits work:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Fast and Great</span> GIF generation costs 2 credits</li>
              <li><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Slow and Good</span> GIF generation costs 1 credit</li>
              <li>Credits never expire</li>
              <li>Payment is processed securely through Stripe</li>
              <li>We don&apos;t store your payment information</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 