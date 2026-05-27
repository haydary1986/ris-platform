// GET /api/v1/researchers/{slug} — single researcher details.

import { createAdminClient } from '@/lib/supabase/admin';
import { publicApi } from '@/lib/api/handler';
import { fail, ok } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, OPTIONS } = publicApi(async (request) => {
  // Next.js doesn't surface the dynamic segment to a generic handler —
  // we recover it from the URL pathname so the wrapper stays generic.
  const slug = new URL(request.url).pathname.split('/').filter(Boolean).pop();
  if (!slug) return fail(400, 'slug missing', 'bad_request');

  const db = createAdminClient();
  const { data } = await db
    .from('researchers_public')
    .select('*')
    .eq('username', slug)
    .maybeSingle();
  if (!data) return fail(404, 'Researcher not found', 'not_found');

  return ok(data);
});
