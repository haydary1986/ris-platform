import { JsonLd } from './json-ld';
import { siteUrl } from '@/lib/seo/site';

// Extra JSON-LD for the landing page: WebSite with SearchAction (enables
// Google's site-links search box) + a SoftwareApplication description
// for RIS itself (helps Google understand the product, not just the
// university) + an FAQPage block. Splitting into three @graph entries
// lets validators read each independently.
//
// Texts are intentionally kept in English — schema.org descriptions
// mostly power Google's English index; the visible landing copy in
// Arabic/English already covers humans.

export function LandingSchema() {
  const url = siteUrl();

  const webSite = {
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    url,
    name: 'AL-Turath University Researcher Directory',
    alternateName: 'RIS — Research Information System',
    inLanguage: ['en', 'ar'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/en/researchers?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const softwareApplication = {
    '@type': 'SoftwareApplication',
    '@id': `${url}/#app`,
    name: 'RIS — AL-Turath Researcher Information System',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url,
    description:
      'A researcher directory and academic profile platform for AL-Turath University. Every faculty member gets a public, citable academic profile with publications, citations, and a one-click CV. Bilingual (Arabic / English).',
    featureList: [
      'Public researcher directory with college and department filters',
      'Academic profile pages with publications, citations, and SDG alignment',
      'One-click CV generator synced with the profile',
      'Scopus, Web of Science, and OpenAlex metrics integration',
      'Bilingual Arabic / English interface with RTL support',
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  const faqPage = {
    '@type': 'FAQPage',
    '@id': `${url}/#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the AL-Turath University Researcher Directory?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'It is the official directory of researchers at AL-Turath University, Iraq. Each researcher has a public academic profile with their biography, research interests, publications, citations, and affiliations — searchable by college, department, research area, or SDG.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does every researcher get an academic profile page?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Every faculty member has a dedicated public profile at ris.uoturath.edu.iq/{locale}/researcher/{username}. The profile serves as their citable academic identity, indexed by Google with Person and ProfilePage structured data.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can researchers generate a CV from their profile?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes — the platform includes a one-click CV generator. Researchers maintain their data once (bio, publications, experience, skills) and export a print-ready CV directly from their profile without re-keying anything.',
        },
      },
      {
        '@type': 'Question',
        name: 'How are publications and metrics kept up to date?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Researchers can import publications from Google Scholar CSV, ORCID OAuth, or Scopus by Author ID. Scopus, Web of Science, and OpenAlex metrics (h-index, citations, publications count) are pulled via official APIs and cached.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is the directory bilingual?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. The interface and all profile content support Arabic and English with proper RTL layout, hreflang for both languages, and per-locale canonical URLs for SEO.',
        },
      },
    ],
  };

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@graph': [webSite, softwareApplication, faqPage],
      }}
    />
  );
}
