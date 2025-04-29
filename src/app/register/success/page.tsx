"use client";

import Link from 'next/link';

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D0D0E] p-4">
      <div className="bg-[#1A1A1D] text-gray-100 p-8 rounded-2xl shadow-lg w-full max-w-md text-center">
        <h2 className="text-3xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF]">
          Registration Successful!
        </h2>
        <p className="text-gray-300 mb-6">
          A verification email has been sent to your email address. Please check your inbox (and spam folder) and click the link to verify your account.
        </p>
        <p className="text-gray-300 mb-6">
          After verifying, you will be redirected to the login page.
        </p>
        <Link href="/login" className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-[#FF497D] via-[#A53FFF] to-[#1E3AFF] text-white font-medium rounded-xl hover:opacity-90 transition">
          Go to Login
        </Link>
      </div>
    </div>
  );
}