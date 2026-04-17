interface Props {
  locale: string;
}

const SOURCES = [
  {
    name: 'Scopus',
    color: '#E9711C',
    url: 'https://www.scopus.com',
    svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>',
  },
  {
    name: 'ORCID',
    color: '#A6CE39',
    url: 'https://orcid.org',
    svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8.5 7.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM8 16.5v-6h1v6H8zm3.5 0v-6h2.5c1.38 0 2.5 1.12 2.5 2.5 0 1.1-.7 2.03-1.68 2.37l1.93 1.13h-1.5L13.5 15H12.5v1.5h-1zm1-3h1.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5H12.5v3z"/>',
  },
  {
    name: 'OpenAlex',
    color: '#C34D3F',
    url: 'https://openalex.org',
    svg: '<circle cx="12" cy="12" r="10"/><path d="M7 12l3 3 5-6" stroke="white" stroke-width="2" fill="none"/>',
  },
  {
    name: 'Clarivate',
    color: '#5E33BF',
    url: 'https://clarivate.com',
    svg: '<path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.18L18 8v8l-6 3.82L6 16V8l6-3.82z"/>',
  },
  {
    name: 'CrossRef',
    color: '#F36F21',
    url: 'https://www.crossref.org',
    svg: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>',
  },
  {
    name: 'Semantic Scholar',
    color: '#1857B6',
    url: 'https://www.semanticscholar.org',
    svg: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
  },
  {
    name: 'Unpaywall',
    color: '#3EB04B',
    url: 'https://unpaywall.org',
    svg: '<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h2c0-1.66 1.34-3 3-3s3 1.34 3 3v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>',
  },
  {
    name: 'Google Scholar',
    color: '#4285F4',
    url: 'https://scholar.google.com',
    svg: '<path d="M5.242 13.769L2 16.5V7.5l10-5.5L22 7.5v9l-3.242-2.731M12 21.5l-6.758-5.731L12 11l6.758 4.769L12 21.5z"/>',
  },
  {
    name: 'Dimensions',
    color: '#5C6BC0',
    url: 'https://www.dimensions.ai',
    svg: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  },
];

export function DataSources({ locale }: Props) {
  const isAr = locale === 'ar';

  return (
    <section className="border-t py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {isAr ? 'مصادر البيانات الموثوقة' : 'Trusted Data Sources'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {SOURCES.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener"
              className="group flex flex-col items-center gap-2 transition-transform hover:scale-110"
              title={s.name}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-8 transition-all group-hover:drop-shadow-lg sm:size-9"
                fill={s.color}
                dangerouslySetInnerHTML={{ __html: s.svg }}
              />
              <span className="text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {s.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
