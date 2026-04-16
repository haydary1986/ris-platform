import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Eye, Settings, ScrollText, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SECTIONS = [
  { href: '/admin/admins', icon: Users, tKey: 'admins' },
  { href: '/admin/visibility', icon: Eye, tKey: 'visibility' },
  { href: '/admin/settings', icon: Settings, tKey: 'settings' },
  { href: '/admin/audit', icon: ScrollText, tKey: 'audit' },
  { href: '/admin/colleges', icon: Building2, tKey: 'colleges' },
] as const;

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.dashboard');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, tKey }) => (
          <Link key={tKey} href={href} className="block">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="text-muted-foreground size-5" />
                  <div>
                    <CardTitle>{t(`cards.${tKey}.title`)}</CardTitle>
                    <CardDescription>{t(`cards.${tKey}.description`)}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
