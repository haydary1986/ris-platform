// Admin broadcast page. Lists recent broadcasts at the top and shows a
// composer underneath. Actual sending happens via /api/push/send so the
// handler can audit, prune dead subscriptions, and write a broadcast
// record in one transaction.

import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getVapidPublicKey } from '@/lib/integrations/config';
import { routing } from '@/i18n/routing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BroadcastForm } from '@/components/admin/push-broadcast-form';

export const dynamic = 'force-dynamic';

interface AdminPushPageProps {
  params: Promise<{ locale: string }>;
}

interface BroadcastRow {
  id: string;
  title: string;
  body: string;
  url: string | null;
  target_locale: string;
  recipient_count: number;
  success_count: number;
  failure_count: number;
  created_at: string;
}

export default async function AdminPushPage({ params }: AdminPushPageProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations('admin.push_page');
  const vapidKey = await getVapidPublicKey();
  const admin = createAdminClient();

  const [{ data: subsCount }, { data: broadcasts }] = await Promise.all([
    admin.from('push_subscriptions').select('id', { count: 'exact', head: true }),
    admin
      .from('push_broadcasts')
      .select(
        'id, title, body, url, target_locale, recipient_count, success_count, failure_count, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const totalSubs = (subsCount as unknown as { count?: number } | null)?.count ?? 0;
  const rows = (broadcasts as BroadcastRow[] | null) ?? [];

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle', { subs: totalSubs })}</p>
      </header>

      {!vapidKey ? (
        <Card>
          <CardContent className="bg-amber-500/10 border-amber-500/40 border text-amber-900 dark:text-amber-200 py-4 text-sm">
            {t('not_configured')}
          </CardContent>
        </Card>
      ) : (
        <BroadcastForm totalSubs={totalSubs} />
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">{t('history_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('history_empty')}</p>
          ) : (
            <ul className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="space-y-1 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{r.title}</p>
                      <p className="text-muted-foreground text-xs">{r.body}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t('history_stats', {
                      recipients: r.recipient_count,
                      success: r.success_count,
                      failure: r.failure_count,
                      locale: r.target_locale,
                    })}
                  </p>
                  {r.url ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener"
                      className="text-primary text-[11px] hover:underline"
                    >
                      {r.url}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
