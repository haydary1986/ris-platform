// Task 102 — Upload handler for .mrhenc files exported by the browser
// extension or console script.
//
// Validation pipeline:
//   1. Auth check (RLS does the final gate, but we fail fast).
//   2. File size cap.
//   3. Base64 decode → JSON.parse.
//   4. Zod schema (FIX-24: version field required, current = 1; older
//      versions get a clean 422 so the user knows to update).
//   5. Calls the merge RPC, which respects RLS (caller can only insert
//      against their own researcher_id).

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard cap on encoded payload

const publicationItem = z.object({
  title: z.string().min(1).max(1000),
  abstract: z.string().max(10_000).optional().nullable(),
  authors: z.array(z.string().max(200)).max(500).optional(),
  journal_name: z.string().max(500).optional().nullable(),
  conference_name: z.string().max(500).optional().nullable(),
  publisher: z.string().max(500).optional().nullable(),
  publication_year: z.number().int().min(1800).max(2100).optional().nullable(),
  doi: z.string().max(200).optional().nullable(),
  url: z.string().max(2000).url().optional().nullable(),
  scholar_citations: z.number().int().min(0).optional().nullable(),
  is_open_access: z.boolean().optional(),
});

const envelope = z.object({
  version: z.literal(1),
  provider: z.literal('scholar'),
  scraped_at: z.string(),
  scholar_id: z.string().nullable().optional(),
  author: z
    .object({
      name: z.string().nullable().optional(),
      affiliation: z.string().nullable().optional(),
    })
    .optional(),
  publications: z.array(publicationItem).max(2000),
});

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data: ownerRow } = await supabase.from('researchers_owner').select('id').maybeSingle();
  if (!ownerRow?.id) {
    return NextResponse.json({ error: 'no_profile' }, { status: 422 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ error: 'read_failed' }, { status: 400 });
  }
  if (raw.length === 0 || raw.length > MAX_BYTES) {
    return NextResponse.json({ error: 'invalid_size' }, { status: 413 });
  }

  let json: unknown;
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    json = JSON.parse(decoded);
  } catch {
    return NextResponse.json({ error: 'invalid_format' }, { status: 400 });
  }

  // FIX-24 — outright reject pre-version-1 payloads with a distinct error
  // so the UI can prompt to update the extension.
  if (
    typeof (json as { version?: unknown })?.version !== 'number' ||
    (json as { version?: number }).version !== 1
  ) {
    return NextResponse.json({ error: 'unsupported_version' }, { status: 422 });
  }

  const parsed = envelope.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'schema_invalid', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  // Strip authors array out into the shape the RPC expects (it iterates
  // jsonb arrays of strings for authors).
  const payload = parsed.data.publications.map((p) => ({
    ...p,
    authors: p.authors ?? [],
  }));

  const { data, error } = await supabase.rpc('update_researcher_publications_google_scholar', {
    p_researcher_id: ownerRow.id,
    p_publications: payload,
  });

  if (error) {
    return NextResponse.json({ error: 'rpc_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...((data as Record<string, unknown>) ?? {}) });
}
