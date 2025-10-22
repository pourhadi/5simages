'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSWRConfig } from 'swr';
import Link from 'next/link';
import { CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

// Define the ProcessingState type locally to avoid import issues
type ProcessingState = 'loading' | 'success' | 'error';

// Child component that uses useSearchParams
function SuccessContent() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [state, setState] = useState<ProcessingState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [creditCount, setCreditCount] = useState<number | null>(null);

  useEffect(() => {
    // Redirect to home if no session ID
    if (!sessionId) {
      router.push('/');
      return;
    }

    // Verify payment success
    const verifyPayment = async () => {
      try {
        // Send auth cookie so Supabase session is available server-side
        const response = await fetch(
          `/api/payments/verify?session_id=${sessionId}`,
          { credentials: 'include' }
        );
        const data = await response.json();

        if (!response.ok) {
          setState('error');
          setError(data.error || 'Failed to verify payment');
          return;
        }

        // Payment verified
        setState('success');
        setCreditCount(data.credits || 0);
        
        // Refresh user data
        mutate('/api/user');
      } catch (err) {
        setState('error');
        setError('An error occurred while verifying your payment');
        console.error('Payment verification error:', err);
      }
    };

    verifyPayment();
  }, [sessionId, router, mutate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0E] p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-[#1A1A1D] rounded-2xl shadow-xl">
        {/* Loading State */}
        {state === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="w-16 h-16 text-[#3EFFE2] animate-spin" />
            <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
              Confirming your purchase
            </h2>
            <p className="text-gray-300 text-center">
              Please wait while we confirm your payment...
            </p>
          </div>
        )}
        
        {/* Success State */}
        {state === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="w-16 h-16 text-[#FF497D]" />
            <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
              Payment Successful!
            </h2>
            {creditCount !== null && (
              <p className="text-gray-300 text-center">
                {creditCount} credits have been added to your account.
              </p>
            )}
            <div className="pt-4 space-y-3 text-center text-gray-300">
              <p>Your balance will update automatically once processing is complete.</p>
              <Link
                href="/gallery"
                className="block w-full py-3 px-6 rounded-xl text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-center font-medium hover:opacity-90 transition"
              >
                Go to your gallery
              </Link>
              <Link
                href="/"
                className="block w-full py-3 px-6 border border-gray-600 text-gray-300 text-center rounded-xl hover:bg-[#1A1A1D] transition"
              >
                Return to home
              </Link>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {state === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="w-16 h-16 text-[#FF497D]" />
            <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
              Payment Verification Failed
            </h2>
            {error && <p className="text-red-400 text-center">{error}</p>}
            <p className="text-gray-300 text-center">
              If you believe this is an error, please contact support.
            </p>
            <div className="pt-4 space-y-3">
              <p className="text-center text-gray-300">
                Credit purchases are currently disabled. If funds were deducted, please contact support with your payment details.
              </p>
              <Link
                href="/"
                className="block w-full py-3 px-6 border border-gray-600 text-gray-300 text-center rounded-xl hover:bg-[#1A1A1D] transition"
              >
                Return to home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0D0D0E] p-4">
          <div className="w-full max-w-md p-8 space-y-4 bg-[#1A1A1D] rounded-2xl shadow-xl">
            <div className="flex flex-col items-center space-y-4">
              <RefreshCw className="w-16 h-16 text-[#3EFFE2] animate-spin" />
              <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
                Loading...
              </h2>
            </div>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
} 