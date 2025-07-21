
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        port: '',
        pathname: '/**',
      },
      // Add your Supabase project URL hostname here
      {
        protocol: 'https',
        hostname: '*.supabase.co', // A more generic pattern that should work
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
