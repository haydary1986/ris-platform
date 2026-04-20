import { getTranslations, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/components/ui/button';
import { Shield } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

const NAV_KEYS = [
  'setup',
  'integrations',
  'branding',
  'users',
  'admins',
  'visibility',
  'settings',
  'audit',
  'auth-logs',
  'error-log',
  'retracted',
  'colleges',
  'chat',
  'notifications',
] as const;

export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/sign-in`);

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const t = await getTranslations('admin');

  if (!adminRow) {
    return (
      <main className="container mx-auto flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <Shield className="text-muted-foreground size-12" />
        <h1 className="text-xl font-semibold">403</h1>
        <p className="text-muted-foreground text-sm">{t('forbidden')}</p>
      </main>
    );
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-8 md:flex-row">
      <aside className="shrink-0 space-y-1 md:w-52">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider">{t('title')}</h2>
        <Link
          href="/admin"
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'w-full justify-start',
          })}
        >
          {t('nav.dashboard')}
        </Link>
        {NAV_KEYS.map((key) => (
          <Link
            key={key}
            href={`/admin/${key}`}
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'w-full justify-start',
            })}
          >
            {t(`nav.${key}`)}
          </Link>
        ))}
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
