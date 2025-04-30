'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Removed axios import; using fetch for API requests to ensure proper cookie handling
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Define the schema for login form validation
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'), // No min length check needed here, just required
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });


  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Login failed');
      }
      toast.success('Login successful!');
      // Redirect to home page after login (full reload to ensure cookies are applied)
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Login failed:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Login failed. Please check your credentials.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex items-center justify-center py-12 p-4">
      <div className="bg-[#1A1A1D] text-gray-100 p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
          Login
        </h2>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
            <input
              id="email"
              type="email"
              {...register('email')}
            className={`mt-1 block w-full px-4 py-3 bg-[#0D0D0E] text-gray-100 border ${errors.email ? 'border-red-500' : 'border-gray-600'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3EFFE2] focus:border-transparent placeholder-gray-500`}
              disabled={isLoading}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
            <input
              id="password"
              type="password"
              {...register('password')}
            className={`mt-1 block w-full px-4 py-3 bg-[#0D0D0E] text-gray-100 border ${errors.password ? 'border-red-500' : 'border-gray-600'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3EFFE2] focus:border-transparent placeholder-gray-500`}
              disabled={isLoading}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>
        <button
          type="submit"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-6 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
} 