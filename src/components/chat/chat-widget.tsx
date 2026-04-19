'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Sparkles, X, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Convert a small subset of markdown (bold + links) into safe HTML nodes.
// DeepSeek tends to reply with bullets + [Name](url) which is all we need.
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
  const withBreaks = withBold.replace(/\n/g, '<br/>');
  return { __html: withBreaks };
}

export function ChatWidget() {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('chat');
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/chat', { method: 'GET' })
      .then((r) => r.json())
      .then((j: { available?: boolean }) => setAvailable(Boolean(j.available)))
      .catch(() => setAvailable(false));
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
    const history = [...messages, userMsg];
    setMessages([...history, assistantMsg]);
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
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (json.error === 'rate_limited') {
          toast.error(t('errors.rate_limited'));
        } else if (json.error === 'not_configured') {
          toast.error(t('errors.not_configured'));
        } else {
          toast.error(t('errors.generic'));
        }
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
          if (type === 'delta') {
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

  if (!available) return null;

  const side = locale === 'ar' ? 'left-4' : 'right-4';
  const panelSide = locale === 'ar' ? 'left-4' : 'right-4';

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
          className={`bg-background fixed bottom-4 ${panelSide} z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border shadow-2xl`}
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
