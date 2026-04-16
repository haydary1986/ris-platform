import type { MetadataRoute } from 'next';
import { absoluteUrl, ROBOTS_DISALLOW } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ROBOTS_DISALLOW,
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl(''),
  };
}
