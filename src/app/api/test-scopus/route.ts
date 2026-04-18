import { NextResponse } from 'next/server';
import { getIntegrationValue } from '@/lib/integrations/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = await getIntegrationValue('integration.scopus.api_key');
  if (!apiKey) return NextResponse.json({ error: 'No Scopus API key configured' });

  try {
    // Search for AL-Turath University affiliation
    const res = await fetch(
      'https://api.elsevier.com/content/search/affiliation?query=AFFIL(Al-Turath%20University)&count=5',
      {
        headers: { 'X-ELS-APIKey': apiKey, Accept: 'application/json' },
        cache: 'no-store',
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Scopus ${res.status}`, body: text.slice(0, 300) });
    }

    const data = await res.json();
    const entries = data['search-results']?.entry ?? [];

    const results = entries.map((e: Record<string, unknown>) => ({
      id: e['dc:identifier'],
      name: e['affiliation-name'],
      docs: e['document-count'],
      city: e['city'],
      country: e['country'],
    }));

    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: String(e) });
  }
}
