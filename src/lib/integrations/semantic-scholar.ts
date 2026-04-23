// Semantic Scholar API client — minimal surface for the enrichment MVP.
// We only need two fields per paper so there's no point in a generic
// client: fetch by DOI, return influential citations + TLDR, swallow 404
// so missing papers don't blow up a batch.
//
// Graph API docs: https://api.semanticscholar.org/graph/v1
// Endpoint:       GET /paper/DOI:{doi}?fields=tldr,influentialCitationCount,citationCount
//
// No key is required for low-volume use (100 req/s shared pool). An API
// key from semanticscholar.org/product/api raises the personal limit and
// is used when configured in /admin/integrations.

import { getSemanticScholarApiKey } from './config';

const BASE = 'https://api.semanticscholar.org/graph/v1';
const FIELDS = 'tldr,influentialCitationCount,citationCount';

export interface SemanticScholarFacts {
  influentialCitations: number | null;
  tldr: string | null;
  citationCount: number | null;
}

interface PaperResponse {
  tldr?: { model?: string; text?: string } | null;
  influentialCitationCount?: number | null;
  citationCount?: number | null;
}

// Normalise a DOI as accepted by the SS graph API. The service accepts
// raw DOIs but users routinely paste full URLs, so strip the doi.org host
// before sending.
function normaliseDoi(doi: string): string {
  return doi
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '');
}

export async function fetchPaperFactsByDoi(doi: string): Promise<SemanticScholarFacts | null> {
  const clean = normaliseDoi(doi);
  if (!clean) return null;

  const apiKey = await getSemanticScholarApiKey();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const url = `${BASE}/paper/DOI:${encodeURIComponent(clean)}?fields=${FIELDS}`;

  let res: Response;
  try {
    res = await fetch(url, { headers, cache: 'no-store' });
  } catch {
    return null;
  }

  // 404 = unknown paper (not indexed). 429 = rate limited. Treat both as
  // "no data this run" so the caller can move on and retry the row later.
  if (!res.ok) return null;

  let body: PaperResponse;
  try {
    body = (await res.json()) as PaperResponse;
  } catch {
    return null;
  }

  return {
    influentialCitations:
      typeof body.influentialCitationCount === 'number' ? body.influentialCitationCount : null,
    tldr: body.tldr?.text?.trim() || null,
    citationCount: typeof body.citationCount === 'number' ? body.citationCount : null,
  };
}
