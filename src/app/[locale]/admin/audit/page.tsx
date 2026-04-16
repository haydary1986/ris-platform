import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AuditPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.audit');
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('audit_log')
    .select('id, action, entity_type, entity_id, actor_user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {!logs || logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('noLogs')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t('date')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('actor')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('action')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('entity')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {log.actor_user_id?.slice(0, 8) ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="outline">{log.action}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {log.entity_type}/{log.entity_id?.slice(0, 8) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
