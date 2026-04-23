import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Eye, Settings, ScrollText, Building2, Download, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import NextLink from 'next/link';
import { EnrichPublicationsButton } from '@/components/admin/enrich-publications-button';

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
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {locale === 'ar' ? 'تصدير البيانات' : 'Export Data'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <NextLink
            href="/api/export/researchers"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Download className="size-4" />
            {locale === 'ar' ? 'تصدير الباحثين (CSV)' : 'Export Researchers (CSV)'}
          </NextLink>
          <NextLink
            href="/api/export/publications"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Download className="size-4" />
            {locale === 'ar' ? 'تصدير المنشورات (CSV)' : 'Export Publications (CSV)'}
          </NextLink>
        </CardContent>
      </Card>

      {/* Semantic Scholar enrichment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4" />
            {locale === 'ar'
              ? 'إثراء المنشورات (Semantic Scholar)'
              : 'Enrich Publications (Semantic Scholar)'}
          </CardTitle>
          <CardDescription>
            {locale === 'ar'
              ? 'يضيف ملخّصات AI وعدد الاقتباسات المؤثّرة لكل منشور له DOI. يُشغَّل يدوياً بعد الاستيراد.'
              : 'Adds AI-generated TLDRs and influential citation counts for every publication with a DOI. Run after imports.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EnrichPublicationsButton />
        </CardContent>
      </Card>
    </div>
  );
}
