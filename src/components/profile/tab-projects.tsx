import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Locale } from '@/i18n/routing';
import type { ProfilePayload, ProjectRow } from '@/lib/profile/types';

interface TabProjectsProps {
  payload: ProfilePayload;
  locale: Locale;
}

function pickTitle(p: ProjectRow, locale: Locale): string {
  return (locale === 'ar' && p.title_ar) || p.title_en;
}

function pickDescription(p: ProjectRow, locale: Locale): string | null {
  return (locale === 'ar' && p.description_ar) || p.description_en;
}

function ProjectCard({
  p,
  locale,
  role: roleLabel,
  fundedBy,
}: {
  p: ProjectRow;
  locale: Locale;
  role: string;
  fundedBy: string;
}) {
  const desc = pickDescription(p, locale);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{pickTitle(p, locale)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {desc ? <p className="text-muted-foreground whitespace-pre-line">{desc}</p> : null}
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {p.funding_agency ? <span>{fundedBy.replace('{agency}', p.funding_agency)}</span> : null}
          {p.role ? <span>{roleLabel.replace('{role}', p.role)}</span> : null}
          {(p.start_date || p.end_date) && (
            <span>
              {p.start_date ?? '?'} – {p.end_date ?? '…'}
            </span>
          )}
        </div>
        {p.url ? (
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs hover:underline"
          >
            {p.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

export async function TabProjects({ payload, locale }: TabProjectsProps) {
  const t = await getTranslations('profile.projects');
  const { projects } = payload;

  if (projects.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">{t('empty')}</p>;
  }

  const active = projects.filter((p) => p.status === 'active');
  const completed = projects.filter((p) => p.status === 'completed');
  const other = projects.filter((p) => p.status !== 'active' && p.status !== 'completed');

  const roleLabel = t('role', { role: '{role}' });
  const fundedBy = t('funded_by', { agency: '{agency}' });

  return (
    <div className="space-y-8">
      {active.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide">{t('active')}</h3>
            <Badge variant="secondary">{active.length}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((p) => (
              <ProjectCard key={p.id} p={p} locale={locale} role={roleLabel} fundedBy={fundedBy} />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide">{t('completed')}</h3>
            <Badge variant="secondary">{completed.length}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {completed.map((p) => (
              <ProjectCard key={p.id} p={p} locale={locale} role={roleLabel} fundedBy={fundedBy} />
            ))}
          </div>
        </section>
      ) : null}

      {other.length > 0 ? (
        <section>
          <div className="grid gap-3 md:grid-cols-2">
            {other.map((p) => (
              <ProjectCard key={p.id} p={p} locale={locale} role={roleLabel} fundedBy={fundedBy} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
