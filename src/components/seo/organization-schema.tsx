import { JsonLd } from './json-ld';
import { siteUrl } from '@/lib/seo/site';

// Task 76 — Organization JSON-LD on the landing page.
export function OrganizationSchema() {
  const url = siteUrl();
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'CollegeOrUniversity',
        name: 'University of Mosul',
        alternateName: 'جامعة الموصل',
        url,
        sameAs: ['https://en.wikipedia.org/wiki/University_of_Mosul', 'https://uomosul.edu.iq'],
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'IQ',
          addressLocality: 'Mosul',
        },
      }}
    />
  );
}
