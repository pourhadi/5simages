import type {Metadata, Viewport} from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import Footer from "@/components/Footer";

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
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "StillMotion.ai", statusBarStyle: "black-translucent" }
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#0D0D0E",
    colorScheme: "dark"
}

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
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
    </head>
    <body className={`${inter.className} bg-[#0D0D0E] text-gray-100`}>
          <Toaster position="bottom-right" toastOptions={{ 
            style: {
              background: '#1e293b',
              color: '#f3f4f6',
            },
          }} />
          <main>
            {children}
          </main>
          <Footer />
      </body>
    </html>
  );
}
