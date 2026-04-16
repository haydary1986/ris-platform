import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JsonLd } from '@/components/seo/json-ld';

export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

async function fetchPublication(id: string) {
  const supabase = await createClient();
  const { data: pub } = await supabase
    .from('researcher_publications_public')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!pub) return null;
  const { data: coauthors } = await supabase
    .from('publication_coauthors')
    .select('author_name, author_order, linked_researcher_id')
    .eq('publication_id', id)
    .order('author_order');
  return { pub, coauthors: coauthors ?? [] };
}

function cite(
  pub: {
    title: string;
    doi: string | null;
    journal_name: string | null;
    publication_year: number | null;
    id: string;
  },
  authors: string[],
) {
  const a = authors.length > 0 ? authors.join(', ') : 'Unknown';
  const y = pub.publication_year;
  const j = pub.journal_name;
  const d = pub.doi;
  const apa = `${a}.${y ? ` (${y})` : ''} ${pub.title}.${j ? ` ${j}.` : ''}${d ? ` https://doi.org/${d}` : ''}`;
  const mla = `${a}. "${pub.title}."${j ? ` ${j},` : ''}${y ? ` ${y}` : ''}.`;
  const bib = [
    `@article{${pub.id.slice(0, 8)},`,
    `  title = {${pub.title}},`,
    `  author = {${authors.join(' and ')}},`,
    y ? `  year = {${y}},` : null,
    j ? `  journal = {${j}},` : null,
    d ? `  doi = {${d}},` : null,
    '}',
  ]
    .filter(Boolean)
    .join('\n');
  return { apa, mla, bib };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const result = await fetchPublication(id);
  if (!result) return { title: '404' };
  const path = `/publication/${id}`;
  const alts = buildLanguageAlternates(path);
  return {
    title: result.pub.title,
    alternates: {
      canonical: canonicalForLocale(locale as Locale, path),
      languages: alts.languages,
    },
    openGraph: { type: 'article', title: result.pub.title, locale },
  };
}

export default async function PublicationPage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  let result: Awaited<ReturnType<typeof fetchPublication>> = null;
  try {
    result = await fetchPublication(id);
  } catch {
    /* Supabase unreachable */
  }
  if (!result) notFound();

  const { pub, coauthors } = result;
  const authors = coauthors.map((c) => c.author_name);
  const { apa, mla, bib } = cite(pub, authors);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: pub.title,
    author: authors.map((a) => ({ '@type': 'Person', name: a })),
    datePublished: pub.publication_year ? String(pub.publication_year) : undefined,
    isPartOf: pub.journal_name ? { '@type': 'Periodical', name: pub.journal_name } : undefined,
    identifier: pub.doi
      ? { '@type': 'PropertyValue', propertyID: 'DOI', value: pub.doi }
      : undefined,
    sameAs: pub.doi ? `https://doi.org/${pub.doi}` : undefined,
    keywords: pub.keywords?.length ? pub.keywords : undefined,
    citationCount: pub.scopus_citations ?? undefined,
  };

  return (
    <main className="container mx-auto flex flex-col gap-6 px-4 py-8">
      <JsonLd data={jsonLd} />
      <Breadcrumbs
        items={[
          { href: '/researchers', label: 'researchers' },
          { label: pub.title.length > 60 ? `${pub.title.slice(0, 57)}...` : pub.title },
        ]}
      />
      <h1 className="text-2xl font-semibold leading-snug tracking-tight">{pub.title}</h1>

      {authors.length > 0 && (
        <div className="flex flex-wrap gap-1 text-sm">
          {coauthors.map((c, i) => (
            <span key={`${c.author_name}-${i}`}>
              {c.linked_researcher_id ? (
                <Link
                  href={`/researcher/${c.linked_researcher_id}`}
                  className="text-primary hover:underline"
                >
                  {c.author_name}
                </Link>
              ) : (
                <span className="text-muted-foreground">{c.author_name}</span>
              )}
              {i < coauthors.length - 1 && <span className="text-muted-foreground">,&nbsp;</span>}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {pub.journal_name && <span className="font-medium">{pub.journal_name}</span>}
        {pub.publication_year && (
          <span className="text-muted-foreground">({pub.publication_year})</span>
        )}
        {pub.doi && (
          <a
            href={`https://doi.org/${pub.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs"
          >
            DOI: {pub.doi}
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {pub.is_scopus && <Badge variant="secondary">Scopus</Badge>}
        {pub.is_wos && <Badge variant="secondary">WoS</Badge>}
        {pub.is_open_access && <Badge variant="outline">Open Access</Badge>}
        {pub.scopus_citations != null && pub.scopus_citations > 0 && (
          <Badge variant="secondary">
            {pub.scopus_citations} citation{pub.scopus_citations !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {pub.keywords?.length ? (
        <div className="flex flex-wrap gap-1">
          {(pub.keywords as string[]).map((kw) => (
            <Link key={kw} href={`/topic/${encodeURIComponent(kw)}`}>
              <Badge variant="outline" className="hover:bg-accent cursor-pointer">
                {kw}
              </Badge>
            </Link>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Citation Formats</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(
            [
              ['APA', apa],
              ['MLA', mla],
              ['BibTeX', bib],
            ] as const
          ).map(([label, text]) => (
            <div key={label}>
              <p className="mb-1 text-xs font-semibold">{label}</p>
              <pre className="bg-muted overflow-x-auto rounded p-2 text-xs whitespace-pre-wrap">
                {text}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
