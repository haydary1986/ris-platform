// AI chat endpoint backed by DeepSeek. Streams text deltas to the client
// via Server-Sent Events. The full researcher directory is baked into the
// system prompt (see lib/chat/context.ts) so the model retrieves matches
// by reasoning rather than RAG — fine for ≤500 researchers.
//
// Rate limits (in-memory, 24h rolling):
//   * anonymous visitors: 10 messages per IP
//   * authenticated users: 30 messages per user
//
// DeepSeek API is OpenAI-compatible, so the request shape matches what the
// Anthropic/OpenAI/Vercel AI SDK would expect.

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getDeepseekApiKey } from '@/lib/integrations/config';
import { getSystemPrompt } from '@/lib/chat/context';
import { checkChatRateLimit, getClientKey } from '@/lib/chat/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';
const MAX_TOKENS = 1000;

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
});

const inputSchema = z.object({
  locale: z.enum(['ar', 'en']),
  messages: z.array(messageSchema).min(1).max(10),
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
  const apiKey = await getDeepseekApiKey();
  if (!apiKey) return sseError('not_configured', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return sseError('invalid_body', 400);
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return sseError('invalid_input', 400);

  // Auth is optional — anonymous visitors get a tighter quota.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const key = getClientKey(request, userId);
  const limit = checkChatRateLimit(key, Boolean(userId));
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

  const systemPrompt = await getSystemPrompt(parsed.data.locale);

  // Forward to DeepSeek's streaming endpoint and relay deltas as SSE.
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
      messages: [{ role: 'system', content: systemPrompt }, ...parsed.data.messages],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    return sseError('upstream_failed', 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`event: meta\ndata: ${JSON.stringify({ remaining: limit.remaining })}\n\n`),
      );
      const reader = upstream.body!.getReader();
      let buffer = '';
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
                controller.enqueue(
                  encoder.encode(`event: delta\ndata: ${JSON.stringify({ text: delta })}\n\n`),
                );
              }
            } catch {
              // tolerate malformed chunks — DeepSeek sometimes emits keepalives
            }
          }
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

// Lightweight config probe — the widget uses this to decide whether to render.
export async function GET(): Promise<Response> {
  const apiKey = await getDeepseekApiKey();
  return Response.json({ available: Boolean(apiKey) });
}
