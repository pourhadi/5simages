"use client";

import Link from 'next/link';

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0E] text-gray-100 p-4">
      <div className="bg-gray-800 text-gray-100 p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-white">Registration Successful!</h2>
        <p className="text-gray-300 mb-6">
          A verification email has been sent to your email address. Please check your inbox (and spam folder) and click the link to verify your account.
        </p>
        <p className="text-gray-300 mb-6">
          After verifying, you will be redirected to the login page.
        </p>
        <Link href="/login" className="font-medium text-[#FF7733] hover:text-[#E05E20]">
          Go to Login
        </Link>
      </div>
    </div>
  );
}