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
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0E] p-4">
      {status === 'loading' && <p>Confirming your email...</p>}
      {status === 'success' && (
        <div className="bg-[#1A1A1D] p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <h1 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
            Email Confirmed
          </h1>
          <p className="text-gray-300">{message}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="bg-[#1A1A1D] p-8 rounded-2xl shadow-lg text-center w-full max-w-md">
          <h1 className="text-3xl font-extrabold mb-2 text-red-400">Confirmation Error</h1>
          <p className="text-gray-300">{message}</p>
          <button
            className="mt-6 px-6 py-3 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-white rounded-xl hover:opacity-90 transition"
            onClick={() => router.push('/login')}
          >
            Go to Login
          </button>
        </div>
      )}
    </div>
  );
}