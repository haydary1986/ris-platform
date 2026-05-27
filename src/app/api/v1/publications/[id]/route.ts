// GET /api/v1/publications/{id} — single publication with its co-authors.

import { createAdminClient } from '@/lib/supabase/admin';
import { publicApi } from '@/lib/api/handler';
import { fail, ok } from '@/lib/api/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const { GET, OPTIONS } = publicApi(async (request) => {
  const id = new URL(request.url).pathname.split('/').filter(Boolean).pop();
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return fail(400, 'Invalid publication id', 'bad_request');
  }

  const db = createAdminClient();
  const [{ data: pub }, { data: coauthors }] = await Promise.all([
    db.from('researcher_publications_public').select('*').eq('id', id).maybeSingle(),
    db
      .from('researcher_publication_coauthors_public')
      .select('author_name, author_order, linked_researcher_id')
      .eq('publication_id', id)
      .order('author_order'),
  ]);

  if (!pub) return fail(404, 'Publication not found', 'not_found');
  return ok({ ...(pub as object), authors: coauthors ?? [] });
});
