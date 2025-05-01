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
  // icons: {
  //   icon: [{ url: '/logo.png', type: 'image/png' }],
  //   shortcut: '/logo.png',
  //   apple: '/logo.png',
  // },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, title: "StillMotion.ai", statusBarStyle: "black-translucent" }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
    <head>
        <title>StillMotion.ai</title>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="theme-color" content="#0D0D0E" media="(prefers-color-scheme: dark)"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
    </head>
    <body className={`${inter.className} bg-[#0D0D0E] text-gray-100`}>
    <AuthProvider>
          <Toaster position="bottom-right" toastOptions={{ 
            style: {
              background: '#1e293b',
              color: '#f3f4f6',
            },
          }} />
          <Navbar />
          <main className="max-w-7xl mx-auto sm:py-6 lg:py-12 sm:px-6 lg:px-8">
            {children}
          </main>
          {process.env.NODE_ENV === 'development' && <RefreshCredits />}
        </AuthProvider>
      </body>
    </html>
  );
}
