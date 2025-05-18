'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';

import useSWR from 'swr';
import Image from 'next/image';

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  credits: number | null;
  isAdmin: boolean | null;
  createdAt: string;
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
  const [sortBy, setSortBy] = useState<'email' | 'name' | 'credits' | 'isAdmin' | 'createdAt'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [editCredits, setEditCredits] = useState<Record<string, number>>({});
  const { data: users, mutate: mutateUsers } = useSWR<AdminUser[]>(
    `/api/admin/users?sortBy=${sortBy}&order=${order}`,
    fetcher
  );
  const { data: videos } = useSWR<AdminVideo[]>('/api/admin/videos', fetcher);

  const handleSort = (field: 'email' | 'name' | 'credits' | 'isAdmin' | 'createdAt') => {
    if (sortBy === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setOrder('asc');
    }
  };

  const handleCreditInputChange = (userId: string, value: string) => {
    const num = parseInt(value, 10);
    setEditCredits(prev => ({ ...prev, [userId]: isNaN(num) ? 0 : num }));
  };

  const updateCredits = async (userId: string) => {
    const newCredits = editCredits[userId];
    if (newCredits === undefined) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: userId, credits: newCredits }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to update credits');
      }
      toast.success('Credits updated');
      mutateUsers();
    } catch (err) {
      console.error('Credit update failed', err);
      toast.error(err instanceof Error ? err.message : 'Error updating credits');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="py-2 pr-4">
                  <button onClick={() => handleSort('email')} className="flex items-center">
                    Email {sortBy === 'email' && <span className="ml-1">{order === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th className="py-2 pr-4">
                  <button onClick={() => handleSort('name')} className="flex items-center">
                    Name {sortBy === 'name' && <span className="ml-1">{order === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th className="py-2 pr-4">
                  <button onClick={() => handleSort('createdAt')} className="flex items-center">
                    Created At {sortBy === 'createdAt' && <span className="ml-1">{order === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th className="py-2 pr-4">
                  <button onClick={() => handleSort('credits')} className="flex items-center">
                    Credits {sortBy === 'credits' && <span className="ml-1">{order === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
                <th className="py-2 pr-4">
                  <button onClick={() => handleSort('isAdmin')} className="flex items-center">
                    Admin {sortBy === 'isAdmin' && <span className="ml-1">{order === 'asc' ? '▲' : '▼'}</span>}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(users) && users.map((u) => (
              <tr key={u.id} className="border-b border-gray-800">
                  <td className="py-1 pr-4">{u.email}</td>
                  <td className="py-1 pr-4">{u.name}</td>
                  <td className="py-1 pr-4">{new Date(u.createdAt).toLocaleString()}</td>
                  <td className="py-1 pr-4 flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      value={editCredits[u.id] ?? (u.credits ?? 0)}
                      onChange={(e) => handleCreditInputChange(u.id, e.target.value)}
                      className="w-16 bg-[#0D0D0E] text-gray-100 border border-gray-600 rounded px-2 py-1"
                    />
                    <button
                      onClick={() => updateCredits(u.id)}
                      className="text-blue-400 hover:underline"
                    >
                      Save
                    </button>
                  </td>
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
