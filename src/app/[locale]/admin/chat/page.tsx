// Admin audit of AI chat conversations. Primary use: skim what visitors
// are actually asking to spot UX gaps — directories people can't find,
// common phrasings the model mishandles, etc.

import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { routing } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface Row {
  id: string;
  user_id: string | null;
  session_id: string | null;
  locale: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  ip_address: string | null;
  created_at: string;
}

interface Msg {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface AdminChatPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ c?: string }>;
}

export default async function AdminChatPage({ params, searchParams }: AdminChatPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('admin.chat_page');

  // Use the admin client to read across both anon and signed-in
  // conversations. RLS on chat_conversations + chat_messages otherwise hides
  // anon sessions from even is_admin() SELECTs because they have no user_id.
  const adminClient = createAdminClient();
  const { data: conversations } = await adminClient
    .from('chat_conversations')
    .select(
      'id, user_id, session_id, locale, title, message_count, last_message_at, ip_address, created_at',
    )
    .order('updated_at', { ascending: false })
    .limit(100);

  const rows = (conversations as Row[] | null) ?? [];
  const { c: activeId } = await searchParams;
  const active = rows.find((r) => r.id === activeId) ?? rows[0] ?? null;

  let messages: Msg[] = [];
  if (active) {
    const { data } = await adminClient
      .from('chat_messages')
      .select('id, conversation_id, role, content, created_at')
      .eq('conversation_id', active.id)
      .order('created_at', { ascending: true });
    messages = (data as Msg[] | null) ?? [];
  }

  // User lookup for the "who asked this" column — best-effort only.
  const userEmailById = new Map<string, string>();
  {
    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
    for (const id of userIds.slice(0, 100)) {
      const { data } = await adminClient.auth.admin.getUserById(id);
      if (data?.user?.email) userEmailById.set(id, data.user.email);
    }
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </header>

      <div className="text-muted-foreground text-xs">
        {t('stats', { total: rows.length, users: userEmailById.size })}
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">{t('conversations')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <p className="text-muted-foreground p-4 text-center text-xs">{t('empty')}</p>
            ) : (
              <ul className="max-h-[70vh] overflow-y-auto">
                {rows.map((r) => {
                  const who = r.user_id
                    ? (userEmailById.get(r.user_id) ?? t('user'))
                    : t('anonymous');
                  const isActive = r.id === active?.id;
                  return (
                    <li key={r.id} className="border-b last:border-b-0">
                      <a
                        href={`?c=${r.id}`}
                        className={`block px-3 py-2 text-xs hover:bg-accent ${
                          isActive ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={r.user_id ? 'default' : 'outline'}
                            className="text-[10px]"
                          >
                            {r.user_id ? t('signed_in') : t('anonymous')}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {r.locale}
                          </Badge>
                          <span className="text-muted-foreground ms-auto text-[10px]">
                            {r.message_count}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-medium">{r.title || t('untitled')}</p>
                        <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                          {who} · {new Date(r.last_message_at || r.created_at).toLocaleString()}
                        </p>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              {active ? active.title || t('untitled') : t('pick_conversation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[70vh] space-y-3 overflow-y-auto">
            {!active ? (
              <p className="text-muted-foreground py-8 text-center text-xs">
                {t('pick_conversation_body')}
              </p>
            ) : messages.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-xs">{t('no_messages')}</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        m.role === 'user' ? 'opacity-70' : 'text-muted-foreground'
                      }`}
                    >
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-[10px]">{t('privacy_note')}</p>
    </section>
  );
}
