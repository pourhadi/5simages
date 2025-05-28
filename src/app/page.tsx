 'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LandingPageV2 from '@/components/v2/LandingPage';
import GalleryScreenV2 from '@/components/v2/GalleryScreen';

export default function HomePage() {
  const router = useRouter();
  
  // Intercept Supabase recovery links sent as hash fragments on home page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('access_token') && hash.includes('type=recovery')) {
        // Redirect to reset-password page, preserving the hash with tokens
        router.replace('/reset-password' + hash);
      }
    }
  }, [router]);
  
  const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then((res) => {
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    });
  const { data: user, error } = useSWR('/api/user', fetcher);

  // Show landing page for non-authenticated users
  if (error || !user) {
    return <LandingPageV2 />;
  }

  // Show gallery for authenticated users
  return <GalleryScreenV2 />;
}
