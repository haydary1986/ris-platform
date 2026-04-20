// Register a Web Push subscription for the signed-in user.
//
// The browser produces the subscription object after the user grants
// notification permission and we `pushManager.subscribe()`. We store
// endpoint + keys so the server can later encrypt payloads and POST
// them to the browser's push service.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(10).max(200),
  auth: z.string().min(10).max(200),
  locale: z.enum(['ar', 'en']).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const userAgent = request.headers.get('user-agent') ?? null;

  // Upsert so re-subscribing from the same browser doesn't multiply rows.
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
      user_agent: userAgent,
      locale: parsed.data.locale ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' },
  );
  if (error) {
    return NextResponse.json({ error: 'storage_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ error: 'missing_endpoint' }, { status: 400 });

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);
  if (error) {
    return NextResponse.json({ error: 'storage_failed', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
