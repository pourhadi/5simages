'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Chrome } from 'lucide-react';
import { signInWithGoogle } from '@/lib/supabaseBrowser';

// Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register schema  
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});


interface AuthPagesV2Props {
  mode: 'login' | 'register';
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function AuthPagesV2({ mode, searchParams }: AuthPagesV2Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isLogin = mode === 'login';
  const isRegistrationDisabled = !isLogin;
  const [redirectUrl, setRedirectUrl] = useState<string>('/');
  
  // Check for OAuth errors and redirect parameter
  React.useEffect(() => {
    if (searchParams) {
      const error = searchParams.error;
      const message = searchParams.message;
      const redirect = searchParams.redirect;
      
      if (error === 'oauth_error') {
        toast.error(
          typeof message === 'string' 
            ? decodeURIComponent(message) 
            : 'Failed to sign in with Google. Please try again.'
        );
      } else if (error === 'access_denied') {
        toast.error('Please sign in to continue.');
      }
      
      // Set redirect URL if provided
      if (redirect && typeof redirect === 'string') {
        setRedirectUrl(decodeURIComponent(redirect));
      }
    }
  }, [searchParams]);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    mode: 'onChange',
    defaultValues: isLogin 
      ? { email: '', password: '' }
      : { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: Record<string, string>) => {
    if (!isLogin) {
      toast.error('New account sign-ups are currently disabled.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `${isLogin ? 'Login' : 'Registration'} failed`);
      }
      
      if (isLogin) {
        toast.success('Login successful!');
        // Force a hard refresh to ensure authentication state is updated
        // This is necessary because SWR might cache the unauthenticated state
        window.location.href = redirectUrl;
      } else {
        // Registration - redirect to success page
        const responseData = await res.json();
        toast.success(responseData.message || 'Registration successful! Please check your email to confirm your account.');
        router.push('/register/success');
      }
    } catch (error) {
      console.error(`${isLogin ? 'Login' : 'Registration'} failed:`, error);
      let errorMessage = `${isLogin ? 'Login' : 'Registration'} failed. Please try again.`;
      
      if (error instanceof Error) {
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please confirm your email before signing in.';
        } else if (error.message.includes('User already registered')) {
          errorMessage = 'An account with this email already exists.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isLogin) {
      toast.error('New account sign-ups are currently disabled.');
      return;
    }

    setIsGoogleLoading(true);
    try {
      // Store redirect URL in session storage for OAuth callback
      if (redirectUrl !== '/') {
        sessionStorage.setItem('authRedirect', redirectUrl);
      }
      await signInWithGoogle();
      // The OAuth flow will redirect, so we don't need to do anything else here
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to sign in with Google. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0E] via-[#1A1A1D] to-[#0D0D0E] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FF497D]/5 via-transparent to-transparent"></div>
      
      <div className="relative w-full max-w-md">
        {/* Back to home button */}
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          <span>Back to home</span>
        </button>

        {/* Auth form container */}
        <div className="bg-[#1A1A1D] border border-[#2A2A2D] rounded-3xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-gray-400">
              {isLogin 
                ? 'Sign in to continue creating amazing GIFs' 
                : 'Start your journey with AI-powered animations'
              }
            </p>
          </div>

          {/* Registration status */}
          {!isLogin && (
            <div className="mb-8 p-4 bg-gradient-to-r from-[#FF497D]/10 to-[#A53FFF]/10 border border-[#FF497D]/20 rounded-2xl">
              <div className="text-center space-y-1">
                <div className="text-[#FF497D] font-semibold">Sign-ups unavailable</div>
                <div className="text-white text-sm">New account registration is currently disabled. Please check back later.</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {/* Name field (register only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-300">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="name"
                    type="text"
                    {...register('name')}
                    className={`w-full pl-12 pr-4 py-3 bg-[#0D0D0E] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF497D] focus:border-transparent text-white placeholder-gray-500 transition-all duration-200 ${
                      errors.name ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-red-400">{errors.name?.message}</p>
                )}
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`w-full pl-12 pr-4 py-3 bg-[#0D0D0E] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF497D] focus:border-transparent text-white placeholder-gray-500 transition-all duration-200 ${
                    errors.email ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email?.message}</p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`w-full pl-12 pr-12 py-3 bg-[#0D0D0E] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF497D] focus:border-transparent text-white placeholder-gray-500 transition-all duration-200 ${
                    errors.password ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder={isLogin ? 'Enter your password' : 'Create a strong password'}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password?.message}</p>
              )}
            </div>

            {/* Confirm password field (register only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className={`w-full pl-12 pr-12 py-3 bg-[#0D0D0E] border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF497D] focus:border-transparent text-white placeholder-gray-500 transition-all duration-200 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="Confirm your password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-400">{errors.confirmPassword?.message}</p>
                )}
              </div>
            )}

            {/* Forgot password link (login only) */}
            {isLogin && (
              <div className="text-right">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-[#FF497D] hover:text-[#A53FFF] transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || isRegistrationDisabled}
              className="w-full py-3 px-6 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] rounded-xl text-white font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-[#FF497D]/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading
                ? (isLogin ? 'Signing in...' : 'Creating account...')
                : (isLogin ? 'Sign In' : 'Create Account')
              }
            </button>
          </form>

          {/* Google Sign-In */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2A2A2D]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#1A1A1D] px-4 text-gray-400">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading || isGoogleLoading || isRegistrationDisabled}
            className="w-full py-3 px-6 bg-[#0D0D0E] border border-[#2A2A2D] rounded-xl text-white font-semibold transition-all duration-300 hover:bg-[#2A2A2D] hover:border-[#3A3A3D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Chrome size={20} />
            {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          {/* Footer links */}
          <div className="mt-6 text-center text-sm text-gray-400">
            {isLogin ? (
              <>
                Don&apos;t have an account?{' '}
                <span className="text-gray-500">Sign ups are currently disabled.</span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link
                  href="/login" 
                  className="text-[#FF497D] hover:text-[#A53FFF] transition-colors font-medium"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}