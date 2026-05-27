// Co-author name → researcher_id linker.
//
// Publication import flows (Scholar CSV, ORCID, Scopus) write co-author
// names as plain text into researcher_publication_coauthors.author_name
// without resolving them to existing researcher records. Until they're
// resolved, the co-authorship network graph stays empty even when many
// of those authors are themselves Al-Turath researchers in our directory.
//
// This module does best-effort name matching:
//   1. Exact match after aggressive normalisation
//   2. Token-set match (every word of the shorter name appears in the
//      longer one) — catches order swaps, middle initials, and the
//      "Family, Given" comma form
//
// Matching is intentionally conservative: we'd rather leave a row
// unlinked than wrongly attribute someone else's paper to a researcher.

// Strip honorifics, punctuation, and collapse whitespace. Lowercases
// the input so the matcher is case-insensitive. Arabic letters are
// preserved as-is — they have no case but the rest of the pipeline
// still needs to compare them as bytes.
export function normaliseName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[‎‏‪-‮]/g, '') // strip BiDi marks
    .replace(/[.,;:'"`()[\]{}]/g, ' ')
    .replace(/\b(dr|prof|mr|mrs|ms|sr|jr|assoc|asst|professor|doctor|د|أ|أ\.د|د\.)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return s.split(' ').filter((t) => t.length >= 2);
}

interface ResearcherCandidate {
  id: string;
  full_name_en_n: string;
  full_name_ar_n: string;
  tokens_en: string[];
  tokens_ar: string[];
}

export interface IndexedResearchers {
  byNormName: Map<string, string>; // exact-match short-circuit
  candidates: ResearcherCandidate[];
}

export function buildIndex(
  rows: Array<{ id: string; full_name_en: string; full_name_ar: string }>,
): IndexedResearchers {
  const byNormName = new Map<string, string>();
  const candidates: ResearcherCandidate[] = [];
  for (const r of rows) {
    const en = normaliseName(r.full_name_en || '');
    const ar = normaliseName(r.full_name_ar || '');
    if (en) byNormName.set(en, r.id);
    if (ar) byNormName.set(ar, r.id);
    candidates.push({
      id: r.id,
      full_name_en_n: en,
      full_name_ar_n: ar,
      tokens_en: tokens(en),
      tokens_ar: tokens(ar),
    });
  }
  return { byNormName, candidates };
}

// Token-set match: returns true when every token of the shorter name
// appears (as a whole word) in the longer name, AND both names share
// at least 2 tokens. The 2-token floor stops common first names like
// "Ali" matching every Ali in the directory.
function tokenSetMatch(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length < 2) return false;
  const longerSet = new Set(longer);
  return shorter.every((t) => longerSet.has(t));
}

export function matchAuthor(name: string, index: IndexedResearchers): string | null {
  const norm = normaliseName(name);
  if (!norm) return null;

  // (1) Exact match wins.
  const exact = index.byNormName.get(norm);
  if (exact) return exact;

  // (2) Token-set match against EN then AR.
  const nameTokens = tokens(norm);
  if (nameTokens.length < 2) return null;

  let best: { id: string; score: number } | null = null;
  for (const c of index.candidates) {
    let matched = false;
    if (c.tokens_en.length > 0 && tokenSetMatch(nameTokens, c.tokens_en)) matched = true;
    if (!matched && c.tokens_ar.length > 0 && tokenSetMatch(nameTokens, c.tokens_ar)) {
      matched = true;
    }
    if (!matched) continue;

    // Score = number of overlapping tokens, longer overlap wins so a
    // 3-token match beats a 2-token match when both are plausible.
    const set = new Set([...c.tokens_en, ...c.tokens_ar]);
    let overlap = 0;
    for (const t of nameTokens) if (set.has(t)) overlap += 1;
    if (!best || overlap > best.score) best = { id: c.id, score: overlap };
  }
  return best?.id ?? null;
}
