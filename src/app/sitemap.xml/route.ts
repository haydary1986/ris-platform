// /sitemap.xml — sitemap index. Lists every chunk produced by
// generateSitemaps() in src/app/sitemaps/sitemap.ts (the metadata file is
// nested under /sitemaps/ so this URL is free for the index — Next.js 16
// otherwise reserves /sitemap.xml when an app-root sitemap.ts uses
// generateSitemaps but doesn't actually serve an index there).
//
// robots.txt points crawlers at this URL.

import { absoluteUrl } from '@/lib/seo/site';
import { listSitemapIds } from '../sitemaps/sitemap';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const ids = await listSitemapIds();
  const lastmod = new Date().toISOString();

  const entries = ids
    .map(
      (id) =>
        `  <sitemap><loc>${absoluteUrl(`/sitemaps/sitemap/${id}.xml`)}</loc><lastmod>${lastmod}</lastmod></sitemap>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
