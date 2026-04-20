// Returns the most recent broadcasts that a signed-in user would have
// received — i.e. those targeted at their locale or 'all'. Used by the
// notification bell dropdown in the header.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 200 });

  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') === 'ar' ? 'ar' : 'en';

  // Use admin client because push_broadcasts table is admin-readable
  // only via is_admin() check — normal users can't select from it. We
  // scope to broadcasts that WOULD reach this user (their locale or all).
  const admin = createAdminClient();
  const { data } = await admin
    .from('push_broadcasts')
    .select('id, title, body, url, target_locale, created_at')
    .in('target_locale', [locale, 'all'])
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ items: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
}
