// RSS 2.0 feed of recent publications. Feed readers, aggregators, and
// the university's main site widget consume this — same data as the
// featured-publications strip on the landing page, but in a format
// readers and feedmills understand.

import { createAdminClient } from '@/lib/supabase/admin';
import { xmlEscape } from '@/lib/oai/oai-pmh';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 600; // 10 min — the underlying data churns slowly

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ris.uoturath.edu.iq';
const FEED_LIMIT = 50;

interface PubRow {
  id: string;
  title: string;
  abstract: string | null;
  publication_year: number | null;
  publication_date: string | null;
  doi: string | null;
  journal_name: string | null;
  updated_at: string;
  created_at: string;
}

function toRfc822(input: string): string {
  return new Date(input).toUTCString();
}

export async function GET(): Promise<Response> {
  const db = createAdminClient();
  const { data } = await db
    .from('researcher_publications_public')
    .select(
      'id, title, abstract, publication_year, publication_date, doi, journal_name, updated_at, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(FEED_LIMIT);

  const rows = (data as PubRow[] | null) ?? [];
  const lastBuild = toRfc822(rows[0]?.updated_at ?? new Date().toISOString());

  const items = rows
    .map((p) => {
      const link = `${SITE_URL}/publication/${p.id}`;
      const pubDate = toRfc822(p.publication_date ?? p.created_at);
      const description = p.abstract ?? p.journal_name ?? '';
      return `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="true">${xmlEscape(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${xmlEscape(description)}</description>
      ${p.journal_name ? `<source url="${xmlEscape(link)}">${xmlEscape(p.journal_name)}</source>` : ''}
      ${p.doi ? `<dc:identifier xmlns:dc="http://purl.org/dc/elements/1.1/">doi:${xmlEscape(p.doi)}</dc:identifier>` : ''}
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Al-Turath University — Research Publications</title>
    <link>${SITE_URL}</link>
    <description>Latest research publications from Al-Turath University.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
