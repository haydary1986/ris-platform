// Authenticated chat page. Signed-in users land here from the user menu
// (instead of the floating bubble) and get persistent conversations with
// full memory.

import { notFound, redirect } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getDeepseekApiKey, isDeepseekEnabled } from '@/lib/integrations/config';
import { routing } from '@/i18n/routing';
import { ChatConsole } from '@/components/chat/chat-console';

export const dynamic = 'force-dynamic';

interface ChatPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ c?: string }>;
}

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const [apiKey, enabled] = await Promise.all([getDeepseekApiKey(), isDeepseekEnabled()]);
  const available = Boolean(apiKey) && enabled;

  const { data: conversations } = await supabase
    .from('chat_conversations')
    .select('id, title, message_count, last_message_at, updated_at, locale')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(100);

  const { c: initialId } = await searchParams;
  const active = conversations?.find((c) => c.id === initialId) ?? conversations?.[0] ?? null;

  let initialMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (active) {
    const { data } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', active.id)
      .order('created_at', { ascending: true });
    initialMessages = (data ?? []).map((row) => ({
      role: row.role as 'user' | 'assistant',
      content: row.content,
    }));
  }

  const t = await getTranslations('chat.page');

  return (
    <main className="container mx-auto flex flex-col px-4 py-6">
      <header className="mb-4 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </header>

      {!available ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-6 text-center">
          <p className="text-sm font-semibold">{t('unavailable_title')}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t('unavailable_body')}</p>
        </div>
      ) : (
        <ChatConsole
          locale={locale as 'ar' | 'en'}
          conversations={conversations ?? []}
          activeConversationId={active?.id ?? null}
          initialMessages={initialMessages}
        />
      )}
    </main>
  );
}
