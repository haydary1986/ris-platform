// Co-authorship network — visual map of who has co-published with whom
// across the Al-Turath researcher directory. Data comes from the
// existing get_coauthorship_graph RPC so we don't duplicate the graph
// extraction logic that's already battle-tested.

import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { routing, type Locale } from '@/i18n/routing';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import { CoauthorsGraph } from '@/components/network/coauthors-graph';

export const revalidate = 1800;

interface Props {
  params: Promise<{ locale: string }>;
}

interface GraphPayload {
  nodes: Array<{
    id: string;
    username: string;
    name: string;
    college_id: string | null;
    h_index: number | null;
  }>;
  links: Array<{ source: string; target: string }>;
}

const NETWORK_LIMIT = 800;

async function fetchGraph(): Promise<GraphPayload | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc('get_coauthorship_graph', { p_limit: NETWORK_LIMIT });
    return (data as GraphPayload | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: 'network' });
  const alts = buildLanguageAlternates('/network');
  return {
    title: t('title'),
    description: t('lead'),
    alternates: {
      canonical: canonicalForLocale(locale as Locale, '/network'),
      languages: alts.languages,
    },
  };
}

export default async function NetworkPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('network');

  const graph = await fetchGraph();
  const hasData = graph && graph.nodes.length > 0;

  return (
    <main className="container mx-auto max-w-6xl px-4 py-12">
      <header className="space-y-3">
        <p className="text-primary text-xs font-semibold uppercase tracking-wider">
          {t('eyebrow')}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground max-w-3xl text-base leading-relaxed">{t('lead')}</p>
      </header>

      <section className="mt-8">
        {hasData ? (
          <CoauthorsGraph nodes={graph.nodes} links={graph.links} width={1100} height={650} />
        ) : (
          <div className="bg-muted/30 rounded-lg border p-12 text-center">
            <p className="text-muted-foreground text-sm">{t('empty')}</p>
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <div className="bg-card rounded-md border p-4">
          <p className="text-2xl font-bold tabular-nums">{graph?.nodes.length ?? 0}</p>
          <p className="text-muted-foreground text-xs">{t('stats.researchers')}</p>
        </div>
        <div className="bg-card rounded-md border p-4">
          <p className="text-2xl font-bold tabular-nums">{graph?.links.length ?? 0}</p>
          <p className="text-muted-foreground text-xs">{t('stats.collaborations')}</p>
        </div>
        <div className="bg-card rounded-md border p-4">
          <p className="text-muted-foreground text-xs leading-relaxed">{t('stats.hint')}</p>
        </div>
      </section>
    </main>
  );
}
