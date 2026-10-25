import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: false,
      },
      {
        source: '/app',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/create',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/create-post',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/new-post',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/posts',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/calendar',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/insights',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/analytics',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/channels',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/connections',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/settings',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/pricing',
        destination: '/#pricing',
        permanent: false,
      },
      {
        source: '/features',
        destination: '/#features',
        permanent: false,
      },
      {
        source: '/faq',
        destination: '/#faq',
        permanent: false,
      },
      {
        source: '/signup',
        destination: '/login?mode=signup',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/login?mode=signup',
        permanent: false,
      },
      {
        source: '/signin',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
