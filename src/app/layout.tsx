import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/context/AuthProvider";
import { Toaster } from 'react-hot-toast';
import Navbar from "@/components/Navbar";
import RefreshCredits from "@/components/RefreshCredits";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StillMotion.ai - Turn an image into a GIF with AI",
  description: "Transform your static images into engaging GIFs with AI",
  icons: {
    icon: [{ url: '/images/stillmotion-logo.svg' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0D0D0E] text-gray-100`}>
        <AuthProvider>
          <Toaster position="bottom-right" toastOptions={{ 
            style: {
              background: '#1e293b',
              color: '#f3f4f6',
            },
          }} />
          <Navbar />
          <main className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8">
            {children}
          </main>
          {process.env.NODE_ENV === 'development' && <RefreshCredits />}
        </AuthProvider>
      </body>
    </html>
  );
}
