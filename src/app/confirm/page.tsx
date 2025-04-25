"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Check for error in query params
    const params = new URL(window.location.href).searchParams;
    const errorDescription = params.get('error_description') || params.get('error');
    if (errorDescription) {
      setStatus('error');
      setMessage(decodeURIComponent(errorDescription));
    } else {
      setStatus('success');
      setMessage('Your email has been confirmed! Redirecting to login...');
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 4000);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0D0D0E] text-gray-100 p-4">
      {status === 'loading' && <p>Confirming your email...</p>}
      {status === 'success' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Email Confirmed</h1>
          <p>{message}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2 text-red-400">Confirmation Error</h1>
          <p>{message}</p>
          <button
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
            onClick={() => router.push('/login')}
          >
            Go to Login
          </button>
        </div>
      )}
    </div>
  );
}