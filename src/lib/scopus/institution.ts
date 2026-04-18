import { getIntegrationValue } from '@/lib/integrations/config';

const AFFILIATION_QUERY = 'AFFILORG(Al-Turath)';

interface ScopusStats {
  totalPublications: number;
  fetchedAt: number;
}

let cached: ScopusStats | null = null;
const CACHE_TTL = 3600_000; // 1 hour

export async function getScopusPublicationCount(): Promise<number | null> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.totalPublications;

  const apiKey = await getIntegrationValue('integration.scopus.api_key');
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(AFFILIATION_QUERY)}&count=0`,
      {
        headers: { 'X-ELS-APIKey': apiKey, Accept: 'application/json' },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;

    const d = await res.json();
    const total = Number(d['search-results']?.['opensearch:totalResults'] ?? 0);
    cached = { totalPublications: total, fetchedAt: Date.now() };
    return total;
  } catch {
    return null;
  }
}
