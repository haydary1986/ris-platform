import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { JsonLd } from './json-ld';
import { siteUrl } from '@/lib/seo/site';

// Task 78 — BreadcrumbList JSON-LD + visible breadcrumb trail.
// Items are rendered in order. The last item is treated as the current page
// (no link). Labels can be a translation key (resolved via 'navigation' or
// 'directory.title') or a literal string.

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

const NAV_KEYS = new Set(['home', 'researchers', 'analytics', 'admin']);

function resolveLabel(
  label: string,
  tNav: (k: string) => string,
  tDir: (k: string) => string,
): string {
  if (label === 'researchers') return tDir('title');
  if (NAV_KEYS.has(label)) return tNav(label);
  return label;
}

export async function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const tNav = await getTranslations('navigation');
  const tDir = await getTranslations('directory');

  const labelled = items.map((it) => ({
    ...it,
    label: resolveLabel(it.label, tNav, tDir),
  }));

  // BreadcrumbList ItemListElement positions are 1-indexed including the home root.
  const listElements = [
    {
      '@type': 'ListItem',
      position: 1,
      name: tNav('home'),
      item: siteUrl(),
    },
    ...labelled.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 2,
      name: it.label,
      item: it.href ? `${siteUrl()}${it.href}` : undefined,
    })),
  ];

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: listElements,
        }}
      />
      <BreadcrumbsTrail items={labelled} />
    </>
  );
}

function BreadcrumbsTrail({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
        {items.map((it, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${it.label}-${idx}`} className="inline-flex items-center gap-1">
              {it.href && !isLast ? (
                <Link href={it.href} className="hover:text-foreground">
                  {it.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'text-foreground font-medium' : undefined}
                >
                  {it.label}
                </span>
              )}
              {!isLast ? <ChevronRight className="size-3 opacity-50 rtl:rotate-180" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
