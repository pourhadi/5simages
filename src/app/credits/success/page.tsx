'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

// Define the ProcessingState type locally to avoid import issues
type ProcessingState = 'loading' | 'success' | 'error';

// Child component that uses useSearchParams
function SuccessContent() {
  const router = useRouter();
  const { status: sessionStatus, update: updateSession } = useSession();
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
        const response = await fetch(`/api/payments/verify?session_id=${sessionId}`);
        const data = await response.json();
        
        if (!response.ok) {
          setState('error');
          setError(data.error || 'Failed to verify payment');
          return;
        }
        
        // Payment verified
        setState('success');
        setCreditCount(data.credits || 0);
        
        // Update session to reflect new credit balance
        if (sessionStatus === 'authenticated') {
          try {
            console.log('Success page: Updating session with new credit balance');
            
            // Multiple session updates to ensure it catches the latest data
            await updateSession();
            
            // Add a small delay then try once more
            setTimeout(async () => {
              console.log('Success page: Refreshing session again after delay');
              await updateSession();
              
              // Force reload after updates to ensure UI refreshes
              setTimeout(() => {
                window.location.reload();
              }, 1000);
            }, 1500);
          } catch (err) {
            console.error('Error updating session:', err);
          }
        }
      } catch (err) {
        setState('error');
        setError('An error occurred while verifying your payment');
        console.error('Payment verification error:', err);
      }
    };
    
    verifyPayment();
  }, [sessionId, router, sessionStatus, updateSession]);
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        {/* Loading State */}
        {state === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="w-16 h-16 text-blue-500 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900">Confirming your purchase</h2>
            <p className="text-gray-600 text-center">
              Please wait while we confirm your payment...
            </p>
          </div>
        )}
        
        {/* Success State */}
        {state === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
            {creditCount !== null && (
              <p className="text-gray-600 text-center">
                {creditCount} credits have been added to your account.
              </p>
            )}
            <div className="pt-4 space-y-3">
              <Link
                href="/gallery"
                className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md shadow transition duration-150"
              >
                Go to your gallery
              </Link>
              <Link
                href="/credits"
                className="block w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white text-center rounded-md shadow transition duration-150"
              >
                Check my balance
              </Link>
              <Link
                href="/"
                className="block w-full py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 text-center rounded-md shadow-sm transition duration-150"
              >
                Return to home
              </Link>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {state === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">Payment Verification Failed</h2>
            {error && <p className="text-red-600 text-center">{error}</p>}
            <p className="text-gray-600 text-center">
              If you believe this is an error, please contact support.
            </p>
            <div className="pt-4 space-y-3">
              <Link
                href="/credits"
                className="block w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-md shadow transition duration-150"
              >
                Try again
              </Link>
              <Link
                href="/"
                className="block w-full py-2 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 text-center rounded-md shadow-sm transition duration-150"
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
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="flex flex-col items-center space-y-4">
            <RefreshCw className="w-16 h-16 text-blue-500 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900">Loading...</h2>
          </div>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
} 