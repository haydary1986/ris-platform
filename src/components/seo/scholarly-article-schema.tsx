import { JsonLd } from './json-ld';
import type { CoauthorRow, ProfilePayload, PublicationRow } from '@/lib/profile/types';

// Task 77 — ScholarlyArticle JSON-LD per publication. Emitted as an array on
// the researcher page so the search index picks them all up in one fetch.
function articleFor(pub: PublicationRow, coauthors: CoauthorRow[]) {
  const authors = coauthors
    .filter((c) => c.publication_id === pub.id)
    .sort((a, b) => a.author_order - b.author_order)
    .map((c) => ({ '@type': 'Person', name: c.author_name }));

  return {
    '@type': 'ScholarlyArticle',
    headline: pub.title,
    abstract: pub.abstract ?? undefined,
    author: authors.length > 0 ? authors : undefined,
    datePublished:
      pub.publication_date ?? (pub.publication_year ? String(pub.publication_year) : undefined),
    isPartOf: pub.journal_name
      ? { '@type': 'Periodical', name: pub.journal_name }
      : pub.conference_name
        ? { '@type': 'Event', name: pub.conference_name }
        : undefined,
    publisher: pub.publisher ? { '@type': 'Organization', name: pub.publisher } : undefined,
    identifier: pub.doi
      ? { '@type': 'PropertyValue', propertyID: 'DOI', value: pub.doi }
      : undefined,
    sameAs: pub.url ?? (pub.doi ? `https://doi.org/${pub.doi}` : undefined),
    keywords: pub.keywords && pub.keywords.length > 0 ? pub.keywords : undefined,
    citationCount: pub.scopus_citations ?? pub.wos_citations ?? pub.scholar_citations ?? undefined,
  };
}

export function PublicationsSchema({ payload }: { payload: ProfilePayload }) {
  const { publications, coauthors } = payload;
  if (publications.length === 0) return null;

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@graph': publications.map((p) => articleFor(p, coauthors)),
      }}
    />
  );
}
