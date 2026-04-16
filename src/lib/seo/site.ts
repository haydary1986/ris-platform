import { routing, type Locale } from '@/i18n/routing';

const FALLBACK_SITE_URL = 'http://localhost:3000';

/**
 * Single source of truth for the public-facing origin. Everything that builds
 * absolute URLs (sitemap, canonical, OG, JSON-LD) goes through this so a
 * deploy can swap the domain via NEXT_PUBLIC_SITE_URL alone.
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_SITE_URL).replace(/\/$/, '');
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Build the {locale: url, x-default: url} map for hreflang alternates.
 * `pathSuffix` is the path AFTER the locale segment (e.g., "/researcher/alamr").
 */
export function buildLanguageAlternates(pathSuffix: string): {
  canonical: string;
  languages: Record<string, string>;
} {
  const suffix = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`;
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(`/${locale}${suffix === '/' ? '' : suffix}`);
  }
  languages['x-default'] = absoluteUrl(`/${routing.defaultLocale}${suffix === '/' ? '' : suffix}`);

  return {
    canonical: languages['x-default'] ?? '',
    languages,
  };
}

export function canonicalForLocale(locale: Locale, pathSuffix: string): string {
  const suffix = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`;
  return absoluteUrl(`/${locale}${suffix === '/' ? '' : suffix}`);
}

export const ROBOTS_DISALLOW = [
  '/admin/',
  '/manage-profile',
  '/api/',
  '/sign-in',
  '/auth/',
  '/monitoring',
];
