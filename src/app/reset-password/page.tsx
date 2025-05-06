"use client";

import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Schema for reset password form
const resetSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ['confirmPassword'],
  });
type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [isLoading, setIsLoading] = useState(false);

  // On mount, extract tokens from URL hash and set session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.substring(1); // strip leading '#'
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token) {
      // No recovery token present; skip automatic session setup
      return;
    }
    supabase.auth
      .setSession({ access_token, refresh_token: refresh_token || '' })
      .catch((err) => {
        console.error('Error setting session from URL', err);
        toast.error('Failed to process reset link');
      });
  }, [supabase]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit: SubmitHandler<ResetFormValues> = async ({ password }) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }
      toast.success('Password updated! Redirecting to login...');
      setTimeout(() => router.push('/login'), 3000);
    } catch (error) {
      console.error('Reset password error:', error);
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 p-4">
      <div className="bg-[#1A1A1D] text-gray-100 p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
          Reset Password
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">New Password</label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className={`mt-1 block w-full px-4 py-3 bg-[#0D0D0E] text-gray-100 border ${errors.password ? 'border-red-500' : 'border-gray-600'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3EFFE2] focus:border-transparent`}
              disabled={isLoading}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              {...register('confirmPassword')}
              className={`mt-1 block w-full px-4 py-3 bg-[#0D0D0E] text-gray-100 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-600'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3EFFE2] focus:border-transparent`}
              disabled={isLoading}
            />
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-6 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Back to{' '}
          <Link href="/login" className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}