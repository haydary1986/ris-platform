import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const publicationItem = z.object({
  title: z.string().min(1).max(1000),
  authors: z.array(z.string().max(200)).max(500).optional(),
  journal_name: z.string().max(500).optional().nullable(),
  publication_year: z.number().int().min(1800).max(2100).optional().nullable(),
  scholar_citations: z.number().int().min(0).optional().nullable(),
  url: z.string().max(2000).optional().nullable(),
});

const envelope = z.object({
  version: z.literal(1),
  provider: z.literal('scholar'),
  publications: z.array(publicationItem).max(2000),
});

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { data: ownerRow } = await supabase.from('researchers_owner').select('id').maybeSingle();
  if (!ownerRow?.id) {
    return NextResponse.json({ ok: false, error: 'No researcher profile found' }, { status: 404 });
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let json: unknown;

    if (contentType.includes('application/json')) {
      json = await request.json();
    } else {
      const formData = await request.formData();
      const encoded = formData.get('data') as string;
      if (!encoded) {
        return NextResponse.json({ ok: false, error: 'No data provided' }, { status: 400 });
      }
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      json = JSON.parse(decoded);
    }

    const parsed = envelope.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid data format' }, { status: 400 });
    }

    const payload = parsed.data.publications.map((p) => ({
      ...p,
      authors: p.authors ?? [],
    }));

    const { data } = await supabase.rpc('update_researcher_publications_google_scholar', {
      p_researcher_id: ownerRow.id,
      p_publications: payload,
    });

    const result = data as { inserted?: number; updated?: number; skipped?: number } | null;

    return NextResponse.json({
      ok: true,
      inserted: result?.inserted ?? 0,
      updated: result?.updated ?? 0,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Import failed' }, { status: 500 });
  }
}
