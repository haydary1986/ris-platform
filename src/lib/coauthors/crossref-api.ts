// Minimal Crossref REST API client. Crossref is the authoritative DOI
// registrar — every DOI-bearing paper has a record here, and many
// publishers register author ORCID iDs at the same time.
//
// We use this as a stronger cross-reference source than the ORCID API
// itself: ORCID gives us a researcher's view of their works (often
// missing contributor iDs), while Crossref gives us the publisher's
// authoritative metadata for every DOI in one shot.
//
// Polite pool: include a contact email in the User-Agent and we get
// higher rate limits + faster servers.

import { getIntegrationValue } from '@/lib/integrations/config';

const BASE = 'https://api.crossref.org';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getUserAgent(): Promise<string> {
  const email =
    (await getIntegrationValue('integration.crossref.email')) ||
    process.env.CROSSREF_EMAIL ||
    'research@uoturath.edu.iq';
  return `RIS-AlTurath/1.0 (mailto:${email})`;
}

export interface CrossrefAuthor {
  given: string | null;
  family: string | null;
  orcid: string | null; // normalised to bare iD (no URL prefix)
}

interface AuthorRaw {
  given?: string;
  family?: string;
  name?: string;
  ORCID?: string;
}

interface MessageRaw {
  author?: AuthorRaw[];
}

interface CrossrefResponse {
  message?: MessageRaw;
}

// Strip Crossref's URL-prefixed ORCID down to the bare 19-character ID
// our DB stores (e.g. "0000-0002-1234-5678").
function normaliseOrcid(raw: string | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/);
  return match ? (match[1] ?? null) : null;
}

export async function fetchCrossrefAuthors(doi: string): Promise<CrossrefAuthor[] | null> {
  const clean = doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '');
  if (!clean) return null;

  const ua = await getUserAgent();
  try {
    const res = await fetch(`${BASE}/works/${encodeURIComponent(clean)}`, {
      headers: { 'User-Agent': ua, Accept: 'application/json' },
      cache: 'no-store',
    });
    // Polite pool — keep well under 50 req/s.
    await sleep(50);
    if (!res.ok) return null;
    const body = (await res.json()) as CrossrefResponse;
    const authors = body.message?.author ?? [];
    return authors.map((a) => ({
      given: a.given ?? null,
      family: a.family ?? a.name ?? null,
      orcid: normaliseOrcid(a.ORCID),
    }));
  } catch {
    return null;
  }
}
