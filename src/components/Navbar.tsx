'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from './Logo';

export default function Navbar() {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number | undefined>(session?.user?.credits);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  
  // Update credits from session when it changes
  useEffect(() => {
    if (session?.user) {
      setCredits(session.user.credits);
    }
  }, [session]);

  // Update session data when on important pages or when credits might change
  useEffect(() => {
    // Define pages where credits might change
    const creditSensitivePages = ['/', '/gallery', '/credits'];
    const isOnCreditSensitivePage = creditSensitivePages.some(page => pathname === page);
    
    if (status === 'authenticated' && isOnCreditSensitivePage) {
      // Create a function to refresh the session
      const refreshSession = async () => {
        await update(); // This forces a session refresh from the server
      };
      
      // Refresh session immediately on mount
      refreshSession();
      
      // Set up event listener for focus to update credits when tab becomes active
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          refreshSession();
        }
      };
      
      // Add listeners for tab focus/visibility
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', refreshSession);
      
      // Poll for updates every 30 seconds, but only on pages where credits change
      const intervalId = setInterval(refreshSession, 30000);
      
      return () => {
        // Clean up listeners and interval
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', refreshSession);
        clearInterval(intervalId);
      };
    }
  }, [pathname, status, update]);
  
  // Don't show navbar on success/cancel pages
  if (pathname?.includes('/credits/success') || pathname?.includes('/credits/cancel')) {
    return null;
  }

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo size="md" />
            </Link>
            
            {/* Desktop Nav Links */}
            <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Create
              </Link>
              <Link
                href="/gallery"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/gallery' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Gallery
              </Link>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          
          {/* User section */}
          <div className="hidden md:flex md:items-center">
            {status === 'authenticated' && session?.user && (
              <div className="flex items-center space-x-4">
                <Link 
                  href="/credits" 
                  className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full transition-colors group"
                >
                  <Zap size={16} className="text-[#FF7733]" />
                  <span className="text-sm font-medium text-white">
                    {credits || 0} credits
                  </span>
                  <ChevronRight size={14} className="text-gray-400 group-hover:text-white transition-colors" />
                </Link>
                <div className="relative group ml-3">
                  <div className="flex items-center">
                    <button className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-white uppercase font-bold">
                        {session.user.name?.charAt(0) || session.user.email?.charAt(0) || '?'}
                      </div>
                    </button>
                  </div>
                  <div className="hidden group-hover:block absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-2 text-xs text-gray-500">
                      Signed in as
                    </div>
                    <div className="px-4 py-2 text-sm font-medium text-gray-700 truncate border-b">
                      {session.user.email}
                    </div>
                    <Link
                      href="/credits"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={closeMenu}
                    >
                      Buy Credits
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {status === 'unauthenticated' && (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 rounded-md text-sm font-medium text-white bg-[#FF7733] hover:bg-[#E05E20]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname === '/' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={closeMenu}
            >
              Create
            </Link>
            <Link
              href="/gallery"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                pathname === '/gallery' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={closeMenu}
            >
              Gallery
            </Link>
          </div>
          
          {/* Mobile user section */}
          {status === 'authenticated' && session?.user && (
            <div className="pt-4 pb-3 border-t border-gray-700">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-white uppercase font-bold">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0) || '?'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium leading-none text-white">
                    {session.user.name || 'User'}
                  </div>
                  <div className="text-sm font-medium leading-none text-gray-400 mt-1">
                    {session.user.email}
                  </div>
                </div>
                <div className="ml-auto bg-gray-700 rounded-full px-3 py-1 flex items-center">
                  <Zap size={14} className="text-[#FF7733] mr-1" />
                  <span className="text-sm font-medium text-white">{credits || 0}</span>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link
                  href="/credits"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700 flex items-center"
                  onClick={closeMenu}
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Buy Credits
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700 flex items-center"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
          
          {status === 'unauthenticated' && (
            <div className="pt-4 pb-3 border-t border-gray-700">
              <div className="px-2 space-y-1">
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700"
                  onClick={closeMenu}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-[#FF7733] hover:bg-[#E05E20]"
                  onClick={closeMenu}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
} 