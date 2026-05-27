// Minimal ORCID Public API client — just the two endpoints we need
// for cross-referencing co-authors.
//
// Public API is anonymous (no token required) and rate-limited to
// 24 requests per second per IP. We respect that with a small delay
// between calls.
//
// API docs: https://info.orcid.org/documentation/api-tutorials/api-tutorial-read-data-on-a-record/

const BASE = 'https://pub.orcid.org/v3.0';
const RATE_LIMIT_MS = 50; // ~20 req/s — comfortably under the 24/s ceiling

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function orcidFetch(path: string): Promise<unknown> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    await sleep(RATE_LIMIT_MS);
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

export interface WorkSummary {
  putCode: string;
  doi: string | null;
  title: string;
}

interface ExternalId {
  'external-id-type'?: string;
  'external-id-value'?: string;
}

interface WorkSummaryRaw {
  'put-code'?: number | string;
  title?: { title?: { value?: string } };
  'external-ids'?: { 'external-id'?: ExternalId[] };
}

interface WorksGroup {
  'work-summary'?: WorkSummaryRaw[];
}

// Extract works summary list for one ORCID record. Each summary carries
// enough metadata (put-code + DOI) to decide whether we want to fetch
// the full work record for it later.
export async function fetchWorksSummary(orcidId: string): Promise<WorkSummary[]> {
  const data = await orcidFetch(`/${encodeURIComponent(orcidId)}/works`);
  if (!data) return [];
  const groups = (data as { group?: WorksGroup[] }).group ?? [];
  const out: WorkSummary[] = [];
  for (const group of groups) {
    const summary = group['work-summary']?.[0];
    if (!summary) continue;
    const doi =
      summary['external-ids']?.['external-id']?.find((e) => e['external-id-type'] === 'doi')?.[
        'external-id-value'
      ] ?? null;
    out.push({
      putCode: String(summary['put-code'] ?? ''),
      doi,
      title: summary.title?.title?.value ?? '',
    });
  }
  return out.filter((w) => w.putCode);
}

export interface Contributor {
  name: string;
  orcid: string | null;
}

interface ContributorRaw {
  'credit-name'?: { value?: string };
  'contributor-orcid'?: { path?: string };
}

interface WorkRaw {
  'put-code'?: number | string;
  contributors?: { contributor?: ContributorRaw[] };
}

interface BulkEntry {
  work?: WorkRaw;
}

interface BulkResponse {
  bulk?: BulkEntry[];
}

// Bulk endpoint — up to 100 put-codes per call. Returns full work
// records that include the <contributors> block we need.
export async function fetchWorksBatch(
  orcidId: string,
  putCodes: string[],
): Promise<Map<string, Contributor[]>> {
  const out = new Map<string, Contributor[]>();
  const CHUNK = 50; // conservative — ORCID accepts up to 100 but big URLs
  for (let i = 0; i < putCodes.length; i += CHUNK) {
    const slice = putCodes.slice(i, i + CHUNK);
    const data = (await orcidFetch(
      `/${encodeURIComponent(orcidId)}/works/${slice.join(',')}`,
    )) as BulkResponse | null;
    if (!data) continue;
    for (const entry of data.bulk ?? []) {
      const work = entry.work;
      if (!work) continue;
      const putCode = String(work['put-code'] ?? '');
      if (!putCode) continue;
      const contribs = (work.contributors?.contributor ?? []).map<Contributor>((c) => ({
        name: c['credit-name']?.value ?? '',
        orcid: c['contributor-orcid']?.path ?? null,
      }));
      out.set(putCode, contribs);
    }
  }
  return out;
}
