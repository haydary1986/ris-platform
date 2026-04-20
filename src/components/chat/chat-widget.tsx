'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Rocket, Send, Sparkles, X, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Very small markdown pass: escape HTML, render **bold** and [label](url).
// DeepSeek replies use little more than that.
function renderMarkdown(text: string): { __html: string } {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const withLinks = escaped.replace(
    /\[([^\]]+)\]\(((?:\/[\w\-/]*)|(?:https?:\/\/[^\s)]+))\)/g,
    (_, label: string, href: string) =>
      `<a href="${href}" class="text-primary underline" target="${href.startsWith('/') ? '_self' : '_blank'}" rel="noopener">${label}</a>`,
  );
  const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return { __html: withBold.replace(/\n/g, '<br/>') };
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem('ris.chat.session_id');
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem('ris.chat.session_id', id);
  }
  return id;
}

export function ChatWidget() {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('chat');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Probe backend config + current auth state in parallel. Logged-in users
  // get a dedicated /chat page via the user menu, so the floating bubble
  // only renders for anonymous visitors.
  useEffect(() => {
    fetch('/api/chat', { method: 'GET', cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { available?: boolean }) => setAvailable(Boolean(j.available)))
      .catch(() => setAvailable(false));

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setAuthed(Boolean(data.user)));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  async function send() {
    const prompt = input.trim();
    if (!prompt || streaming) return;

    const userMsg: ChatMessage = { id: newId(), role: 'user', content: prompt };
    const assistantMsg: ChatMessage = { id: newId(), role: 'assistant', content: '' };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          message: prompt,
          conversationId,
          sessionId: getSessionId(),
        }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (json.error === 'rate_limited') toast.error(t('errors.rate_limited'));
        else if (json.error === 'not_configured') toast.error(t('errors.not_configured'));
        else toast.error(t('errors.generic'));
        setMessages((m) => m.filter((msg) => msg.id !== assistantMsg.id));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const evt of events) {
          const lines = evt.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;
          const type = eventLine.slice(6).trim();
          const payload = dataLine.slice(5).trim();
          if (type === 'meta') {
            try {
              const { conversationId: id } = JSON.parse(payload) as { conversationId?: string };
              if (id) setConversationId(id);
            } catch {
              /* ignore */
            }
          } else if (type === 'delta') {
            try {
              const { text } = JSON.parse(payload) as { text?: string };
              if (text) {
                accumulated += text;
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === assistantMsg.id ? { ...msg, content: accumulated } : msg,
                  ),
                );
              }
            } catch {
              /* malformed chunk */
            }
          } else if (type === 'error') {
            toast.error(t('errors.generic'));
            setMessages((m) => m.filter((msg) => msg.id !== assistantMsg.id));
            return;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error(t('errors.generic'));
        setMessages((m) => m.filter((msg) => msg.id !== assistantMsg.id));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  // Avoid a flash during initial probe.
  if (available === null || authed === null) return null;

  // Authenticated users have their own /chat page reached from the user
  // menu — don't clutter their screen with a floating bubble too.
  if (authed) return null;

  const side = locale === 'ar' ? 'left-4' : 'right-4';

  // Coming-soon mode: the API key isn't configured or admin disabled the
  // assistant. Show the icon + a teaser panel.
  if (!available) {
    return (
      <>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t('coming_soon.open')}
            className={`bg-primary text-primary-foreground hover:bg-primary/90 fixed bottom-4 ${side} z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105`}
          >
            <span className="bg-amber-500 text-amber-950 absolute -top-1 -end-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
              {t('coming_soon.badge')}
            </span>
            <Sparkles className="size-6" />
          </button>
        ) : (
          <div
            className={`bg-background fixed bottom-4 ${side} z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border shadow-2xl`}
            role="dialog"
            aria-label={t('coming_soon.title')}
          >
            <div className="bg-primary text-primary-foreground flex items-center gap-2 px-4 py-3">
              <Rocket className="size-4" />
              <p className="flex-1 truncate text-sm font-semibold">{t('coming_soon.title')}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                className="hover:bg-primary-foreground/10 rounded p-1"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-5 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/15">
                <Rocket className="size-7 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-semibold">{t('coming_soon.heading')}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {t('coming_soon.body')}
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('open')}
          className={`bg-primary text-primary-foreground hover:bg-primary/90 fixed bottom-4 ${side} z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105`}
        >
          <MessageCircle className="size-6" />
        </button>
      ) : (
        <div
          className={`bg-background fixed bottom-4 ${side} z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border shadow-2xl`}
          style={{ height: 'min(32rem, calc(100vh - 6rem))' }}
          role="dialog"
          aria-label={t('title')}
        >
          <div className="bg-primary text-primary-foreground flex items-center gap-2 px-4 py-3">
            <Sparkles className="size-4" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t('title')}</p>
              <p className="truncate text-[11px] opacity-80">{t('subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('close')}
              className="hover:bg-primary-foreground/10 rounded p-1"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
            {messages.length === 0 ? (
              <div className="text-muted-foreground space-y-2 text-center text-xs">
                <p>{t('welcome')}</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {[t('examples.ai'), t('examples.pubs'), t('examples.sdg')].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setInput(ex)}
                      className="hover:bg-accent rounded-md border px-3 py-1.5 text-start text-xs"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  {m.content ? (
                    <div
                      className="[&_a]:underline text-sm leading-relaxed"
                      dangerouslySetInnerHTML={renderMarkdown(m.content)}
                    />
                  ) : (
                    <Loader2 className="size-4 animate-spin opacity-60" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-end gap-2 border-t p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t('placeholder')}
              rows={1}
              disabled={streaming}
              className="border-input bg-background min-h-[36px] max-h-24 flex-1 resize-none rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void send()}
              disabled={!input.trim() || streaming}
              aria-label={t('send')}
            >
              {streaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground px-3 pb-2 text-[10px]">{t('disclaimer')}</p>
        </div>
      )}
    </>
  );
}
