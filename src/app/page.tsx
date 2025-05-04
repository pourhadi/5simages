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
      <div className="space-y-8 py-8 md:py-0">
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
      
      {/* Free credits note */}
      <aside className="mt-8 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] p-px rounded-lg max-w-2xl mx-auto">
        <div className="bg-[#1A1A1D] p-6 rounded-lg">
          <p className="text-center text-white font-semibold">
              New users get <span class="text-[#3EFFE2]">3 free credits</span>: generate one <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Fast / Great</span> GIF (2 credits) and one <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Slow / Good</span> GIF (1 credit), or three <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Slow / Good</span> GIFs.
          </p>
        </div>
      </aside>
      {/* How It Works section */}
      <div className="mt-10 max-w-4xl mx-auto text-left">
        <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start space-x-4 bg-[#1A1A1D] p-4 rounded-lg">
            <span className="text-3xl">💳</span>
            <div>
              <p className="font-medium text-white">Pay credits to generate a GIF</p>
              <p className="text-gray-400 text-sm">Select an image, add a prompt, and animate it.</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 bg-[#1A1A1D] p-4 rounded-lg">
            <span className="text-3xl">⚡️</span>
            <div>
              <p className="font-medium text-white"><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Fast / Great</span> mode</p>
              <p className="text-gray-400 text-sm">Quick results with high quality (2 credits per GIF).</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 bg-[#1A1A1D] p-4 rounded-lg">
            <span className="text-3xl">🐢</span>
            <div>
              <p className="font-medium text-white"><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">Slow / Good</span> mode</p>
              <p className="text-gray-400 text-sm">Slower generation with good quality (1 credit per GIF).</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 bg-[#1A1A1D] p-4 rounded-lg">
            <span className="text-3xl">🪙</span>
            <div>
              <p className="font-medium text-white">Credits & Pricing</p>
              <p className="text-gray-400 text-sm">Fast / Great: 2 credits per GIF; Slow / Good: 1 credit per GIF.</p>
            </div>
          </div>
        </div>
      </div>
      
      <aside className="mt-8 bg-gray-800 p-6 rounded-lg max-w-2xl text-left">
        <h3 className="text-xl font-semibold mb-2">Why is it so expensive?</h3>
        <p className="text-gray-400">
          We use state-of-the-art video generation AI models that require incredibly powerful GPUs.
          Running these models for each GIF is computationally intensive and costly. Your
          credits help us cover the expenses of these resources.
        </p>
      </aside>
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
