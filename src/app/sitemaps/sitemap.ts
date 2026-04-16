// Tasks 79 + 80 + FIX-12 — Dynamic sitemap with chunking.
//
// Each generateSitemaps() entry becomes /sitemap/{id}.xml. Next.js 16 does
// NOT auto-generate /sitemap.xml as an index — that's served by the route
// handler at src/app/sitemap.xml/route.ts.
//
// Researchers are spread across chunks of 5000 URLs each; static routes ride
// the first chunk.
//
// Note: in Next.js 16 the `id` in the default export is a Promise<string>
// (was a number in v15).

import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';
import { absoluteUrl } from '@/lib/seo/site';

const URLS_PER_SITEMAP = 5000;

interface ResearcherRow {
  username: string;
  updated_at: string;
}

async function totalResearchers(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from('researchers_public')
      .select('id', { count: 'exact', head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function fetchResearcherChunk(offset: number): Promise<ResearcherRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('researchers_public')
      .select('username, updated_at')
      .order('id')
      .range(offset, offset + URLS_PER_SITEMAP - 1);
    return (data ?? []) as ResearcherRow[];
  } catch {
    return [];
  }
}

export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  const total = await totalResearchers();
  const chunks = Math.max(1, Math.ceil(total / URLS_PER_SITEMAP));
  return Array.from({ length: chunks }, (_, i) => ({ id: i }));
}

// Exported so the sitemap.xml index route can list every chunk.
export async function listSitemapIds(): Promise<number[]> {
  const total = await totalResearchers();
  const chunks = Math.max(1, Math.ceil(total / URLS_PER_SITEMAP));
  return Array.from({ length: chunks }, (_, i) => i);
}

function localizedAlternates(suffix: string): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of routing.locales) {
    alternates[locale] = absoluteUrl(`/${locale}${suffix === '/' ? '' : suffix}`);
  }
  return alternates;
}

function entry(suffix: string, lastModified?: string): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: absoluteUrl(`/${locale}${suffix === '/' ? '' : suffix}`),
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    alternates: { languages: localizedAlternates(suffix) },
    changeFrequency: suffix === '/' ? 'daily' : 'weekly',
    priority: suffix === '/' ? 1.0 : 0.7,
  }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const idStr = await props.id;
  const id = Number.parseInt(idStr, 10) || 0;
  const offset = id * URLS_PER_SITEMAP;
  const researchers = await fetchResearcherChunk(offset);

  const researcherEntries: MetadataRoute.Sitemap = routing.locales.flatMap((locale) =>
    researchers.map((r) => ({
      url: absoluteUrl(`/${locale}/researcher/${r.username}`),
      lastModified: new Date(r.updated_at),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, absoluteUrl(`/${l}/researcher/${r.username}`)]),
        ),
      },
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  );

  // Static routes only on the first chunk so they aren't duplicated.
  const staticEntries: MetadataRoute.Sitemap =
    id === 0
      ? [
          ...entry('/'),
          ...entry('/researchers'),
          ...entry('/analytics'),
          ...entry('/about'),
          ...entry('/contact'),
          ...entry('/privacy'),
          ...entry('/terms'),
          ...Array.from({ length: 17 }, (_, n) => entry(`/sdg/${n + 1}`)).flat(),
        ]
      : [];

  return [...staticEntries, ...researcherEntries];
}
