 'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import exampleGif1 from '../../gifs/1.gif';
import exampleGif2 from '../../gifs/2.gif';
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

  // Removed automatic redirect for unauthenticated users

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  // Ensure user exists before proceeding
  // Unauthenticated users: show welcome page
  if (!user && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-8 px-4 text-center">
        <h1 className="text-4xl font-extrabold text-white">Welcome Back!</h1>
        <p className="text-gray-300 max-w-xl">
          Create stunning AI-generated video snippets from your images. Upload a photo, and let our AI animate it into a GIF!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Image src={exampleGif1} alt="Example GIF 1" width={300} height={300} className="rounded-lg shadow-lg" />
          <Image src={exampleGif2} alt="Example GIF 2" width={300} height={300} className="rounded-lg shadow-lg" />
        </div>
        <div className="space-x-4">
          <button onClick={() => router.push('/login')} className="mt-6 bg-[#FF7733] hover:bg-[#E05E20] text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors">
            Log In
          </button>
          <button onClick={() => router.push('/signup')} className="mt-6 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors">
            Sign Up
          </button>
        </div>
      </div>
    );
  }
  // Authenticated users: show dashboard
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
