'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BuyCredits from '@/components/BuyCredits';
import VideoGenerator from '@/components/VideoGenerator';
import Gallery from '@/components/Gallery'; // Placeholder for Gallery component

export default function HomePage() {
  const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then((res) => {
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    });
  const { data: user, error, isLoading } = useSWR('/api/user', fetcher);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && error) {
      router.push('/login');
    }
  }, [isLoading, error, router]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  // Ensure user exists before proceeding
  if (user) {
    const credits = typeof user.credits === 'number' ? user.credits : 0;

    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name || user.email}!</h1>

        {credits > 0 ? (
          <div className="space-y-6">
            <VideoGenerator />
            {/* Placeholder for Gallery */}
            <Gallery />
          </div>
        ) : (
          <BuyCredits />
        )}
      </div>
    );
  }

  // Fallback for unauthenticated state (should be redirected by useEffect, but good practice)
  return null;
}
