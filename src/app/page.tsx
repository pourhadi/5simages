 'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import exampleGif1 from '../../gifs/1.gif';
import exampleGif2 from '../../gifs/2.gif';
import exampleGif3 from '../../gifs/flag.gif';
import BuyCredits from '@/components/BuyCredits';
import VideoGenerator from '@/components/VideoGenerator';
import Gallery from '@/components/Gallery'; // Placeholder for Gallery component

export default function HomePage() {
  const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then((res) => {
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    });
  const { data: user } = useSWR('/api/user', fetcher);
  const router = useRouter();

  // If user is authenticated, show their dashboard
  if (user) {
    const credits = typeof user.credits === 'number' ? user.credits : 0;
    return (
      <div className="space-y-8">
        {/*<h1 className="text-4xl font-extrabold sm:text-center text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">*/}
        {/*  Welcome, {user.name || user.email}!*/}
        {/*</h1>*/}
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
  // If not authenticated (or loading), show welcome page
  return (
    <div className="flex flex-col items-center px-6 text-center py-12 space-y-1">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
        Welcome to StillMotion.ai
      </h1>
      <p className="mt-4 text-gray-400 max-w-2xl">
        Bring your images to life. Upload a photo and let our AI animate it into a stunning GIF.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {[exampleGif1, exampleGif2, exampleGif3].map((gif, idx) => (
          <Image
            key={idx}
            src={gif}
            alt={`Example GIF ${idx + 1}`}
            width={300}
            height={300}
            className="rounded-xl shadow-2xl"
          />
        ))}
      </div>
      <div className="flex space-x-4 mt-10">
        <button
          onClick={() => router.push('/login')}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-[#FF497D] transition"
          // className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#3EFFE2] to-[#1E3AFF] text-gray-900 font-semibold hover:opacity-90 transition"
        >
          Sign In
        </button>
        <button
          onClick={() => router.push('/register')}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-white font-semibold hover:opacity-90 transition"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
