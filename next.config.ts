import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};
module.exports = {
  images: {
    remotePatterns: [new URL('https://afzjzoefogvzdnqmnidz.supabase.co/**')],
  },
}
export default nextConfig;
