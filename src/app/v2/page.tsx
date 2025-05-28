'use client';

import useSWR from 'swr';
import LandingPageV2 from '@/components/v2/LandingPage';
import GalleryScreenV2 from '@/components/v2/GalleryScreen';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((res) => {
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  });

export default function V2HomePage() {
  const { data: user, error } = useSWR('/api/user', fetcher);

  // Show landing page for non-authenticated users
  if (error || !user) {
    return <LandingPageV2 />;
  }

  // Show gallery for authenticated users
  return <GalleryScreenV2 />;
}