import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import Footer from "@/components/Footer";

const MAINTENANCE_TRUE_VALUES = new Set(["true", "1", "yes", "on"]);

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const maintenanceEnvValue = process.env.MAINTENANCE_MODE?.trim().toLowerCase() ?? "";
  const maintenanceModeEnabled = MAINTENANCE_TRUE_VALUES.has(maintenanceEnvValue);

  const bodyBaseClasses = `${inter.className} bg-[#0D0D0E] text-gray-100 min-h-screen ${maintenanceModeEnabled ? "" : "flex flex-col"}`;
  const mainClasses = maintenanceModeEnabled ? "min-h-screen" : "flex-1";

  return (
    <html lang="en">
      <head>
        <title>StillMotion.ai</title>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={bodyBaseClasses}>
        {!maintenanceModeEnabled && (
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f3f4f6',
              },
            }}
          />
        )}
        <main className={mainClasses}>{children}</main>
        {!maintenanceModeEnabled && <Footer />}
      </body>
    </html>
  );
}
