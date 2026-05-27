// Admin-triggered SDG classifier. Walks every publication that has no
// SDG tags yet and assigns based on title + abstract keyword matches.
// Fast (everything happens in-process) so we don't need batching —
// 10k publications classify in ~1s.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { classifySdg } from '@/lib/sdg/classifier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  // When true, re-classifies rows that already have non-empty sdg_goals.
  // Default: only touch rows where the array is still empty.
  refresh: z.boolean().default(false),
});

interface PubRow {
  id: string;
  title: string;
  abstract: string | null;
  sdg_goals: number[] | null;
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const adminDb = createAdminClient();
  let query = adminDb.from('researcher_publications').select('id, title, abstract, sdg_goals');
  if (!parsed.data.refresh) {
    // PostgREST: cardinality(arr) = 0 isn't directly expressible; use the
    // jsonb-style trick of matching empty arrays.
    query = query.or('sdg_goals.is.null,sdg_goals.eq.{}');
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }

  const rows = (data as PubRow[] | null) ?? [];
  let updated = 0;
  let untagged = 0;

  // Update in chunks of 100 so a 10k-pub table doesn't blow the
  // PostgREST request size limit.
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(async (row) => {
        const tags = classifySdg(row.title, row.abstract);
        if (tags.length === 0) {
          untagged += 1;
          return;
        }
        const { error: updErr } = await adminDb
          .from('researcher_publications')
          .update({ sdg_goals: tags })
          .eq('id', row.id);
        if (!updErr) updated += 1;
      }),
    );
  }

  return NextResponse.json({
    ok: true,
    examined: rows.length,
    updated,
    untagged,
  });
}
