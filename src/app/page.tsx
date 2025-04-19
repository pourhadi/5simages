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
        <h1 className="text-4xl font-extrabold text-white">Welcome, {user.name || user.email}!</h1>
        {credits > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <VideoGenerator />
            <Gallery limitItems={9} showViewAll />
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <BuyCredits />
          </div>
        )}
      </div>
    );
  }

  // Fallback for unauthenticated state (should be redirected by useEffect, but good practice)
  return null;
}
