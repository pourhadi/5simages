'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Logo from './Logo';
import { Zap, ChevronRight } from 'lucide-react';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo size="md" />
            </Link>
          </div>
          <div className="flex items-center">
            {status === 'authenticated' && session?.user && (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/gallery?showCredits=true" 
                  className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full transition-colors group"
                >
                  <Zap size={16} className="text-[#FF7733]" />
                  <span className="text-sm font-medium text-white">
                    {session.user.credits || 0} credits
                  </span>
                  <ChevronRight size={14} className="text-gray-400 group-hover:text-white transition-colors" />
                </Link>
                <span className="text-sm font-medium text-gray-300">
                  {session.user.name || session.user.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })} 
                  className="px-3 py-2 rounded-md text-sm font-medium text-white bg-[#FF7733] hover:bg-[#E05E20] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7733]"
                >
                  Logout
                </button>
              </div>
            )}
            {status === 'unauthenticated' && (
              <Link href="/login" className="px-3 py-2 rounded-md text-sm font-medium text-white bg-[#FF7733] hover:bg-[#E05E20] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7733]">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 