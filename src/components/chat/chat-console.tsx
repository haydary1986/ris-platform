'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, Plus, Send, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Conversation {
  id: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  updated_at: string;
  locale: string;
}

interface Msg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatConsoleProps {
  locale: 'ar' | 'en';
  conversations: Conversation[];
  activeConversationId: string | null;
  initialMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

export function ChatConsole({
  locale,
  conversations,
  activeConversationId,
  initialMessages,
}: ChatConsoleProps) {
  const t = useTranslations('chat');
  const tPage = useTranslations('chat.page');
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(activeConversationId);
  const [messages, setMessages] = useState<Msg[]>(
    initialMessages.map((m) => ({ ...m, id: newId() })),
  );
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  function openConversation(id: string | null) {
    if (id === conversationId) return;
    setConversationId(id);
    setMessages([]);
    if (id) {
      router.replace(`/${locale}/chat?c=${id}`);
    } else {
      router.replace(`/${locale}/chat`);
    }
  }

  async function send() {
    const prompt = input.trim();
    if (!prompt || streaming) return;
    const userMsg: Msg = { id: newId(), role: 'user', content: prompt };
    const assistantMsg: Msg = { id: newId(), role: 'assistant', content: '' };
    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput('');
    setStreaming(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          message: prompt,
          conversationId,
        }),
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
      let newConvId: string | null = null;
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
              if (id && id !== conversationId) {
                newConvId = id;
                setConversationId(id);
              }
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
      if (newConvId) {
        router.replace(`/${locale}/chat?c=${newConvId}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      toast.error(t('errors.generic'));
      setMessages((m) => m.filter((msg) => !msg.content));
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      <aside className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => openConversation(null)}
        >
          <Plus className="size-4" />
          {tPage('new_conversation')}
        </Button>
        <div className="bg-card max-h-[60vh] overflow-y-auto rounded-md border">
          {conversations.length === 0 ? (
            <p className="text-muted-foreground p-3 text-center text-xs">
              {tPage('no_conversations')}
            </p>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className={`flex w-full items-start gap-2 border-b px-3 py-2 text-start text-xs last:border-b-0 hover:bg-accent ${
                      c.id === conversationId ? 'bg-accent' : ''
                    }`}
                  >
                    <MessageSquare className="mt-0.5 size-3.5 shrink-0 opacity-60" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.title || tPage('untitled')}</p>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        {new Intl.DateTimeFormat(locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(c.last_message_at || c.updated_at))}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <section className="bg-card flex flex-col overflow-hidden rounded-lg border">
        <div className="bg-primary text-primary-foreground flex items-center gap-2 px-4 py-3">
          <Sparkles className="size-4" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{t('title')}</p>
            <p className="truncate text-[11px] opacity-80">{t('subtitle')}</p>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="min-h-[50vh] flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm"
          style={{ maxHeight: '60vh' }}
        >
          {messages.length === 0 ? (
            <div className="text-muted-foreground space-y-2 text-center text-xs">
              <p>{t('welcome')}</p>
              <div className="mx-auto mt-3 grid max-w-md gap-1.5 sm:grid-cols-3">
                {[t('examples.ai'), t('examples.pubs'), t('examples.sdg')].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setInput(ex)}
                    className="hover:bg-accent rounded-md border px-3 py-1.5 text-xs"
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
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={renderMarkdown(m.content)}
                  />
                ) : (
                  <Loader2 className="size-4 animate-spin opacity-60" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2 border-t p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t('placeholder')}
            rows={2}
            disabled={streaming}
            className="border-input bg-background min-h-[52px] max-h-32 flex-1 resize-none rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void send()}
            disabled={!input.trim() || streaming}
            aria-label={t('send')}
          >
            {streaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        <p className="text-muted-foreground px-4 pb-3 text-[10px]">{t('disclaimer')}</p>
      </section>
    </div>
  );
}
