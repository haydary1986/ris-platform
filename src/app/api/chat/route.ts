// AI chat endpoint backed by DeepSeek. Streams text deltas to the client
// via Server-Sent Events. The full researcher directory is baked into the
// system prompt (see lib/chat/context.ts) so the model retrieves matches
// by reasoning rather than RAG — fine for ≤500 researchers.
//
// Persistence: every turn is stored in chat_conversations + chat_messages
// so the admin audit view can show what people asked. Signed-in users get
// durable conversations keyed by user_id (memory across sessions);
// anonymous visitors get session-scoped conversations keyed by a
// localStorage session_id.
//
// Rate limits (in-memory, 24h rolling):
//   * anonymous visitors: 10 messages per IP
//   * authenticated users: 30 messages per user

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDeepseekApiKey, isDeepseekEnabled } from '@/lib/integrations/config';
import { getSystemPrompt } from '@/lib/chat/context';
import { checkChatRateLimit, getClientKey } from '@/lib/chat/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const MAX_TOKENS = 1000;
const MAX_HISTORY = 20; // safety cap on persisted memory replayed to the model

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
});

const inputSchema = z.object({
  locale: z.enum(['ar', 'en']),
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().nullable().optional(),
  sessionId: z.string().min(1).max(128).nullable().optional(),
});

function sseError(code: string, status = 400): Response {
  return new Response(`event: error\ndata: ${JSON.stringify({ error: code })}\n\n`, {
    status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  const [apiKey, enabled] = await Promise.all([getDeepseekApiKey(), isDeepseekEnabled()]);
  if (!apiKey || !enabled) return sseError('not_configured', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return sseError('invalid_body', 400);
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return sseError('invalid_input', 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Anonymous visitors must supply a sessionId so we can group their turns
  // — the client stores it in localStorage. Signed-in users don't need one;
  // their user_id serves the same purpose.
  if (!userId && !parsed.data.sessionId) {
    return sseError('session_required', 400);
  }

  const rateKey = getClientKey(request, userId);
  const limit = checkChatRateLimit(rateKey, Boolean(userId));
  if (!limit.allowed) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({
        error: 'rate_limited',
        resetAt: limit.resetAt,
        limit: limit.limit,
      })}\n\n`,
      {
        status: 429,
        headers: { 'Content-Type': 'text/event-stream' },
      },
    );
  }

  // Load (or create) the conversation + its history, then forward to
  // DeepSeek with the accumulated turns prepended so the model has memory.
  let conversationId = parsed.data.conversationId ?? null;
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  if (userId && conversationId) {
    const { data } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      conversationId = null; // stranger's id — ignore and start fresh
    } else {
      const { data: rows } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(MAX_HISTORY);
      for (const row of rows ?? []) {
        history.push(messageSchema.parse(row));
      }
    }
  }

  if (userId && !conversationId) {
    const { data } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: userId,
        locale: parsed.data.locale,
        title: parsed.data.message.slice(0, 80),
      })
      .select('id')
      .single();
    conversationId = data?.id ?? null;
  }

  const systemPrompt = await getSystemPrompt(parsed.data.locale);

  const upstream = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      max_tokens: MAX_TOKENS,
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: parsed.data.message },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return sseError('upstream_failed', 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? (forwardedFor.split(',')[0]?.trim() ?? null) : null;
  const userAgent = request.headers.get('user-agent') ?? null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `event: meta\ndata: ${JSON.stringify({
            remaining: limit.remaining,
            conversationId,
          })}\n\n`,
        ),
      );
      const reader = upstream.body!.getReader();
      let buffer = '';
      let assistantText = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') {
              await persistTurn({
                conversationId,
                userId,
                sessionId: parsed.data.sessionId ?? null,
                locale: parsed.data.locale,
                userMessage: parsed.data.message,
                assistantMessage: assistantText,
                ip,
                userAgent,
              }).then((newId) => {
                if (!conversationId && newId) {
                  conversationId = newId;
                  controller.enqueue(
                    encoder.encode(`event: meta\ndata: ${JSON.stringify({ conversationId })}\n\n`),
                  );
                }
              });
              controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                assistantText += delta;
                controller.enqueue(
                  encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: delta })}\n\n`),
                );
              }
            } catch {
              /* tolerate malformed chunks / keepalives */
            }
          }
        }
        if (assistantText) {
          await persistTurn({
            conversationId,
            userId,
            sessionId: parsed.data.sessionId ?? null,
            locale: parsed.data.locale,
            userMessage: parsed.data.message,
            assistantMessage: assistantText,
            ip,
            userAgent,
          });
        }
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      } catch {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'stream_failed' })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

interface PersistParams {
  conversationId: string | null;
  userId: string | null;
  sessionId: string | null;
  locale: 'ar' | 'en';
  userMessage: string;
  assistantMessage: string;
  ip: string | null;
  userAgent: string | null;
}

async function persistTurn(p: PersistParams): Promise<string | null> {
  // Logged-in users: the conversation row was already created above, now
  // just append the turn. RLS enforces ownership.
  if (p.userId && p.conversationId) {
    const supabase = await createClient();
    const { error } = await supabase.from('chat_messages').insert([
      { conversation_id: p.conversationId, role: 'user', content: p.userMessage },
      { conversation_id: p.conversationId, role: 'assistant', content: p.assistantMessage },
    ]);
    if (error) {
      console.error('[chat] persist logged-in turn failed', error.message);
    }
    return p.conversationId;
  }

  // Anonymous: route through the SECURITY DEFINER RPC so the anon key never
  // touches these tables directly.
  if (!p.userId && p.sessionId) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc('record_anonymous_chat_turn', {
        p_conversation_id: p.conversationId,
        p_session_id: p.sessionId,
        p_locale: p.locale,
        p_user_message: p.userMessage,
        p_assistant_message: p.assistantMessage,
        p_ip: p.ip,
        p_user_agent: p.userAgent,
      });
      if (error) {
        console.error('[chat] persist anon turn failed', error.message);
        return null;
      }
      return (data as string | null) ?? null;
    } catch (err) {
      console.error('[chat] persist anon turn threw', err);
      return null;
    }
  }

  return null;
}

// Lightweight config probe — the widget uses this to decide whether to
// render the chat UI (true) or the "coming soon" teaser (false). Both a
// configured key AND the admin toggle must be on.
export async function GET(): Promise<Response> {
  const [apiKey, enabled] = await Promise.all([getDeepseekApiKey(), isDeepseekEnabled()]);
  return Response.json(
    { available: Boolean(apiKey) && enabled },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
  );
}
