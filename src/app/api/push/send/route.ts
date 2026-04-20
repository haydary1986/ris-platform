// Admin-only broadcast endpoint. Encrypts and sends a push notification
// to every subscription, optionally filtered by locale. Writes a record
// of the broadcast so there's an audit trail of what was sent to whom.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVapidPublicKey, getVapidPrivateKey, getVapidSubject } from '@/lib/integrations/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(400),
  url: z.string().trim().max(2000).optional().nullable(),
  locale: z.enum(['ar', 'en', 'all']).default('all'),
});

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: string | null;
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Admin gate — re-check via RPC so the check runs under RLS.
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const [publicKey, privateKey, subject] = await Promise.all([
    getVapidPublicKey(),
    getVapidPrivateKey(),
    getVapidSubject(),
  ]);
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  // Need the admin client to read every subscription across all users.
  const adminDb = createAdminClient();
  const query = adminDb.from('push_subscriptions').select('id, endpoint, p256dh, auth, locale');
  if (parsed.data.locale !== 'all') {
    query.eq('locale', parsed.data.locale);
  }
  const { data: subsData, error: subsError } = await query;
  if (subsError) {
    return NextResponse.json({ error: 'db_error', detail: subsError.message }, { status: 500 });
  }
  const subscriptions = (subsData as SubscriptionRow[] | null) ?? [];

  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url || '/',
    icon: '/icon-192.png',
    tag: `broadcast-${Date.now()}`,
  });

  // Fan out in parallel but don't let one bad endpoint tank the rest.
  // Expired subscriptions (410/404) get pruned so next broadcast doesn't
  // waste time on them.
  const staleIds: string[] = [];
  const results = await Promise.allSettled(
    subscriptions.map((s) =>
      webpush
        .sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        )
        .then(() => ({ id: s.id, ok: true as const }))
        .catch((err: { statusCode?: number }) => {
          if (err.statusCode === 404 || err.statusCode === 410) {
            staleIds.push(s.id);
          }
          return { id: s.id, ok: false as const };
        }),
    ),
  );
  const success = results.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
  const failure = subscriptions.length - success;

  if (staleIds.length > 0) {
    await adminDb.from('push_subscriptions').delete().in('id', staleIds);
  }

  await adminDb.from('push_broadcasts').insert({
    sent_by: user.id,
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url ?? null,
    target_locale: parsed.data.locale,
    recipient_count: subscriptions.length,
    success_count: success,
    failure_count: failure,
  });

  return NextResponse.json({
    ok: true,
    recipients: subscriptions.length,
    success,
    failure,
    pruned: staleIds.length,
  });
}
