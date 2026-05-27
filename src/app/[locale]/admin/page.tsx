import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Eye, Settings, ScrollText, Building2, Download, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import NextLink from 'next/link';
import { EnrichPublicationsButton } from '@/components/admin/enrich-publications-button';
import { ClassifySdgButton } from '@/components/admin/classify-sdg-button';
import { LinkCoauthorsButton } from '@/components/admin/link-coauthors-button';
import { CrosslinkOrcidButton } from '@/components/admin/crosslink-orcid-button';
import { CrosslinkCrossrefButton } from '@/components/admin/crosslink-crossref-button';
import { Link2, Network, Share2, Tag } from 'lucide-react';

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

      {/* SDG auto-tagging */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4" />
            {locale === 'ar' ? 'تصنيف المنشورات حسب SDG' : 'Tag Publications by SDG'}
          </CardTitle>
          <CardDescription>
            {locale === 'ar'
              ? 'يحلّل عناوين وملخّصات المنشورات ويُلصق وسوم أهداف التنمية المستدامة (1–17). يُشغَّل دورياً بعد كل استيراد.'
              : 'Analyses publication titles + abstracts and tags them with UN Sustainable Development Goals (1–17). Run periodically after imports.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClassifySdgButton />
        </CardContent>
      </Card>

      {/* Co-authors linking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Network className="size-4" />
            {locale === 'ar' ? 'ربط المؤلّفين المشاركين' : 'Link Co-authors'}
          </CardTitle>
          <CardDescription>
            {locale === 'ar'
              ? 'يطابق أسماء المؤلّفين المشاركين بسجلات الباحثين الموجودين في النظام. يُفعِّل شبكة التعاون البحثي على /network.'
              : 'Matches co-author text names against existing researcher records. Powers the collaboration network at /network.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LinkCoauthorsButton />
        </CardContent>
      </Card>

      {/* ORCID cross-reference (deterministic, strongest signal) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Share2 className="size-4" />
            {locale === 'ar' ? 'ربط المؤلّفين عبر ORCID' : 'Cross-link via ORCID'}
          </CardTitle>
          <CardDescription>
            {locale === 'ar'
              ? 'يستدعي ORCID API لكل تدريسي. ضعيف في الغالب لأن الباحثين نادراً ما يُضيفون ORCID للمؤلّفين المشاركين في ملفّاتهم.'
              : 'Calls ORCID API per researcher. Often weak — researchers rarely add contributor ORCID iDs to their own ORCID work records.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrosslinkOrcidButton />
        </CardContent>
      </Card>

      {/* Crossref cross-reference — STRONGEST SIGNAL */}
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Link2 className="size-4 text-primary" />
            {locale === 'ar'
              ? 'ربط المؤلّفين عبر Crossref (الأقوى — موصى به)'
              : 'Cross-link via Crossref (strongest — recommended)'}
          </CardTitle>
          <CardDescription>
            {locale === 'ar'
              ? 'يستدعي Crossref API لكل DOI ويربط المؤلّفين بمعرّفات ORCID المُسجَّلة لدى الناشر — أكثر اكتمالاً من ORCID نفسه. يستغرق ٣-٥ دقائق.'
              : 'Calls Crossref API per DOI and links by publisher-registered ORCID iDs — typically more complete than ORCID itself. Takes 3–5 minutes.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CrosslinkCrossrefButton />
        </CardContent>
      </Card>
    </div>
  );
}
