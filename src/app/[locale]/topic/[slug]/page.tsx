import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/seo/breadcrumbs';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const revalidate = 3600;

interface TopicPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

async function fetchPublicationsByKeyword(keyword: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('researcher_publications_public')
    .select(
      'id, researcher_id, title, journal_name, publication_year, doi, is_scopus, is_wos, is_open_access, scopus_citations',
    )
    .contains('keywords', [keyword])
    .order('publication_year', { ascending: false, nullsFirst: false })
    .limit(100);
  return data ?? [];
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const topic = decodeURIComponent(slug);
  const path = `/topic/${slug}`;
  const alts = buildLanguageAlternates(path);

  return {
    title: topic,
    alternates: {
      canonical: canonicalForLocale(locale as Locale, path),
      languages: alts.languages,
    },
    openGraph: { type: 'website', title: `Topic: ${topic}`, locale },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const topic = decodeURIComponent(slug);

  let publications: Awaited<ReturnType<typeof fetchPublicationsByKeyword>> = [];
  try {
    publications = await fetchPublicationsByKeyword(topic);
  } catch {
    // Supabase unreachable -- render empty state.
  }

  const breadcrumbs: BreadcrumbItem[] = [
    { href: '/researchers', label: 'researchers' },
    { label: topic },
  ];

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="text-3xl font-semibold tracking-tight">{topic}</h1>
      <p className="text-muted-foreground text-sm">
        {publications.length} publication{publications.length !== 1 ? 's' : ''}
      </p>

      {publications.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          No publications found for this topic.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {publications.map((pub) => (
            <Link key={pub.id} href={`/publication/${pub.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base leading-snug">{pub.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                  {pub.journal_name && (
                    <span className="text-muted-foreground">{pub.journal_name}</span>
                  )}
                  {pub.publication_year && (
                    <span className="text-muted-foreground">({pub.publication_year})</span>
                  )}
                  {pub.is_scopus && <Badge variant="secondary">Scopus</Badge>}
                  {pub.is_wos && <Badge variant="secondary">WoS</Badge>}
                  {pub.is_open_access && <Badge variant="outline">Open Access</Badge>}
                  {pub.scopus_citations !== null && pub.scopus_citations > 0 && (
                    <span className="text-muted-foreground text-xs">
                      {pub.scopus_citations} citation{pub.scopus_citations !== 1 ? 's' : ''}
                    </span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
