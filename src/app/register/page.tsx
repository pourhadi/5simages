'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Define the schema for registration form validation
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit: SubmitHandler<RegisterFormValues> = async (data) => {
    setIsLoading(true);
    try {
      await axios.post('/api/register', data);
      // Redirect to registration success page where user is prompted to verify their email
      router.push('/register/success');
    } catch (error) {
      console.error('Registration failed:', error);
      let errorMessage = 'Registration failed. Please try again.';
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 p-4">
      <div className="bg-[#1A1A1D] text-gray-100 p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-extrabold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
          Register
        </h2>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className={`mt-1 block w-full px-4 py-3 bg-[#0D0D0E] text-gray-100 border ${errors.name ? 'border-red-500' : 'border-gray-600'} rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3EFFE2] focus:border-transparent placeholder-gray-500`}
              disabled={isLoading}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
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
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] hover:opacity-90 transition">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
} 