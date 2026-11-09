import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://planposter.vercel.app';
  const lastModified = new Date();

  const routes = [
    { url: `${baseUrl}/`, priority: 1.0, changeFrequency: 'weekly' as const },
    { url: `${baseUrl}/pricing`, priority: 0.9, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/login`, priority: 0.8, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/legal`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/terms`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/privacy`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/security`, priority: 0.7, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/sitemap`, priority: 0.6, changeFrequency: 'monthly' as const },
    { url: `${baseUrl}/data-deletion`, priority: 0.6, changeFrequency: 'monthly' as const },
  ];

  return routes.map((r) => ({
    ...r,
    lastModified,
  }));
}
