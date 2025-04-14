'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import BuyCredits from '@/components/BuyCredits';
import VideoGenerator from '@/components/VideoGenerator';
import Gallery from '@/components/Gallery'; // Placeholder for Gallery component

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated and status is not loading
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Show loading state
  if (status === 'loading') {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  // Ensure session and user exist before proceeding
  if (status === 'authenticated' && session?.user) {
    const user = session.user;
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
