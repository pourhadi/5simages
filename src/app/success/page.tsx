'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SuccessPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to gallery with a success parameter that will show a notification
    const timer = setTimeout(() => {
      router.push('/gallery?showCredits=true');
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
        <div className="mb-6 flex justify-center">
          <Loader2 className="h-12 w-12 text-green-500 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your payment has been processed. Your credits have been added to your account.
        </p>
        <p className="text-sm text-gray-500">
          Redirecting you to the gallery...
        </p>
      </div>
    </div>
  );
} 