'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { AlertCircle, Zap } from 'lucide-react';

interface UserResponse {
  credits?: number;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(res => {
    if (!res.ok) {
      throw new Error('Unauthorized');
    }
    return res.json();
  });

export default function CreditsPage() {
  const { data: user, error, isLoading } = useSWR<UserResponse>('/api/user', fetcher, {
    shouldRetryOnError: false,
  });

  return (
    <div className="min-h-screen bg-[#0D0D0E] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1A1A1D] rounded-3xl border border-gray-800 shadow-xl overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-10 w-10 text-[#FF497D]" />
              <div>
                <h1 className="text-3xl font-bold text-white">Credit purchases unavailable</h1>
                <p className="text-gray-300">
                  Buying additional credits is temporarily disabled. You can continue creating GIFs with your existing balance.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#2A2A2D] bg-[#0D0D0E] p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#1A1A1D] flex items-center justify-center">
                  <Zap className="h-6 w-6 text-[#3EFFE2]" />
                </div>
                <div>
                  <p className="text-gray-300">Current credit balance</p>
                  {isLoading ? (
                    <p className="text-white font-semibold">Checking balance...</p>
                  ) : error ? (
                    <p className="text-gray-500">Sign in to view your available credits.</p>
                  ) : (
                    <p className="text-white text-2xl font-bold">{user?.credits ?? 0} credits</p>
                  )}
                </div>
              </div>
              {error && (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition"
                >
                  Sign in to view balance
                </Link>
              )}
            </div>

            <div className="space-y-3 text-gray-400">
              <p>
                We&apos;re working on improvements to the credit system. In the meantime, feel free to explore your gallery or start a new project with the credits you already have.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/gallery"
                  className="flex-1 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition"
                >
                  Go to gallery
                </Link>
                <Link
                  href="/"
                  className="flex-1 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium border border-gray-700 text-gray-300 hover:bg-[#1A1A1D] transition"
                >
                  Return home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
