'use client';

import useSWR from 'swr';
import Image from 'next/image';

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  credits: number | null;
  isAdmin: boolean;
}

interface AdminVideo {
  id: string;
  prompt: string;
  gifUrl?: string | null;
  user?: {
    email: string | null;
  } | null;
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function AdminPage() {
  const { data: users } = useSWR<AdminUser[]>('/api/admin/users', fetcher);
  const { data: videos } = useSWR<AdminVideo[]>('/api/admin/videos', fetcher);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Credits</th>
                <th className="py-2 pr-4">Admin</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) && users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800">
                  <td className="py-1 pr-4">{u.email}</td>
                  <td className="py-1 pr-4">{u.name}</td>
                  <td className="py-1 pr-4">{u.credits}</td>
                  <td className="py-1 pr-4">{u.isAdmin ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Recent GIFs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.isArray(videos) && videos.map((v) => (
            <div key={v.id} className="bg-[#1A1A1D] rounded-lg p-2">
              {v.gifUrl ? (
                <Image src={v.gifUrl} alt={v.prompt} width={200} height={200} className="rounded" />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400">No GIF</div>
              )}
              <p className="mt-1 text-xs truncate" title={v.prompt}>{v.prompt}</p>
              <p className="text-xs text-gray-400">{v.user?.email}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
