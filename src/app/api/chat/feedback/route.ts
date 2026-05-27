// POST /api/chat/feedback — record a 👍/👎 on an assistant message.
// Visitors are anonymous so we identify ratings by (conversation_id,
// message_id) — last vote wins per message.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { ipFromRequest } from '@/lib/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  messageId: z.string().min(1).max(100),
  rating: z.union([z.literal(1), z.literal(-1)]),
  note: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request): Promise<Response> {
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

  const db = createAdminClient();
  const { error } = await db.from('chat_message_feedback').upsert(
    {
      conversation_id: parsed.data.conversationId ?? null,
      message_id: parsed.data.messageId,
      rating: parsed.data.rating,
      note: parsed.data.note ?? null,
      ip: ipFromRequest(request),
    },
    { onConflict: 'conversation_id,message_id' },
  );

  if (error) {
    return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
