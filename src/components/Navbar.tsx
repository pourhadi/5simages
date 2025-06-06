'use client';

import useSWR from 'swr';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Zap, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import Logo from './Logo';

export default function Navbar() {
  const fetcher = (url: string) =>
    fetch(url, { credentials: 'include' }).then((res) => {
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    });
  const { data: user, isLoading, mutate } = useSWR('/api/user', fetcher);
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPathRef = useRef<string | null>(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  
  const openUserMenu = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    setIsUserMenuOpen(true);
  };
  
  const closeUserMenuWithDelay = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
    }
    menuTimeoutRef.current = setTimeout(() => {
      setIsUserMenuOpen(false);
    }, 300); // 300ms delay before closing
  };
  
  // Refresh user data on path change
  useEffect(() => {
    if (lastPathRef.current !== null && lastPathRef.current !== pathname) {
      mutate();
    }
    lastPathRef.current = pathname;
  }, [pathname, mutate]);
  
  // Handle clicks outside the user menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
    };
  }, []);
  
  // Don't show navbar on certain pages
  if (
    pathname?.includes('/credits/success') ||
    pathname?.includes('/credits/cancel') ||
    pathname === '/confirm'
  ) {
    return null;
  }

  return (
    <nav className="bg-[#111111] border-b border-gray-800 py-2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main nav */}
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo size="md" />
            </Link>
            
            {/* Desktop Nav Links */}
            {user && (
              <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
                <Link
                  href="/"
                  className={`px-3 py-2 rounded-md font-medium text-md ${
                    pathname === '/' || pathname === '/gallery' ? 'text-white bg-gray-800' : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                  }`}
                >
                  Create
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-md text-md font-medium ${
                      pathname === '/admin' ? 'text-white bg-gray-800' : 'text-gray-300 hover:bg-gray-900 hover:text-white'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </div>
            )}
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
            {user && (
              <div className="flex items-center space-x-4">
                <Link
                  href="/credits"
                  className="flex items-center gap-1 bg-black hover:bg-gray-800 px-3 h-10 rounded-full transition-colors group"
                  onClick={() => mutate()}
                >
                  <Zap size={16} className="text-[#3EFFE2]" />
                  <span className="text-sm font-medium text-white">
                    {user.credits || 0} credits
                  </span>
                  <ChevronRight size={14} className="text-gray-400 group-hover:text-white transition-colors" />
                </Link>
                <div 
                  className="relative ml-3" 
                  ref={userMenuRef}
                  onMouseEnter={openUserMenu}
                  onMouseLeave={closeUserMenuWithDelay}
                >
                  <div className="flex items-center">
                    <button 
                      className="flex text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    >
                      <span className="sr-only">Open user menu</span>
                      <div className="h-10 w-10 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center text-white uppercase font-bold">
                        {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                    </button>
                  </div>
                  {isUserMenuOpen && (
                    <div 
                      className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-gray-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                      onMouseEnter={openUserMenu}
                      onMouseLeave={closeUserMenuWithDelay}
                    >
                      <div className="px-4 py-2 text-xs text-gray-200">
                        Signed in as
                      </div>
                      <div className="px-4 py-2 text-sm font-medium text-gray-400 truncate border-b border-gray-700">
                        {user.email}
                      </div>
                      <Link
                        href="/credits"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
                        onClick={() => mutate()}
                      >
                        Buy Credits
                      </Link>
                      <button
                        onClick={async () => {
                          // Sign out via API and redirect to login (full reload)
                          await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                          if (typeof window !== 'undefined') {
                            window.location.href = '/login';
                          } else {
                            router.push('/login');
                          }
                        }}
                        className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
          {!user && !isLoading && (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 hover:text-[#FF497D] transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-white hover:opacity-90 transition"
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
          {user && (
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                href="/"
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  pathname === '/' || pathname === '/gallery' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
                onClick={closeMenu}
              >
                Create
              </Link>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === '/admin' ? 'text-white bg-gray-900' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                  onClick={closeMenu}
                >
                  Admin
                </Link>
              )}
            </div>
          )}
          
          {/* Mobile user section */}
          {user && (
            <div className="pt-4 pb-3 border-t border-gray-700">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center text-white uppercase font-bold">
                    {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium leading-none text-white">
                    {user.name || 'User'}
                  </div>
                  <div className="text-sm font-medium leading-none text-gray-400 mt-1">
                    {user.email}
                  </div>
                </div>
                <div className="ml-auto bg-gray-700 rounded-full px-3 py-1 flex items-center">
                  <Zap size={14} className="text-[#3EFFE2] mr-1" />
                  <span className="text-sm font-medium text-white">{user.credits || 0}</span>
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
                  onClick={async () => {
                    // Sign out via API and redirect to login (full reload)
                    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
                    if (typeof window !== 'undefined') {
                      window.location.href = '/login';
                    } else {
                      router.push('/login');
                    }
                  }}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-400 hover:text-white hover:bg-gray-700 flex items-center"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
          
          {!user && !isLoading && (
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
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition"
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