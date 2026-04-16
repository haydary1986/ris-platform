import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Locale } from '@/i18n/routing';
import type { ProfilePayload } from '@/lib/profile/types';

interface TabExperienceProps {
  payload: ProfilePayload;
  locale: Locale;
}

export async function TabExperience({ payload, locale }: TabExperienceProps) {
  const t = await getTranslations('profile.experience');
  const { work, certifications, awards } = payload;

  return (
    <div className="space-y-10">
      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">{t('work')}</h3>
        {work.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('empty_work')}</p>
        ) : (
          <ol className="border-s ps-4">
            {work.map((w) => {
              const position = (locale === 'ar' && w.position_ar) || w.position_en;
              const org = (locale === 'ar' && w.organization_ar) || w.organization_en;
              const desc = (locale === 'ar' && w.description_ar) || w.description_en;
              const range = `${w.start_date ?? '?'} – ${w.is_current ? t('current') : (w.end_date ?? '…')}`;
              return (
                <li key={w.id} className="relative mb-5 ps-4 last:mb-0">
                  <span className="bg-primary absolute -start-[5px] top-2 size-2 rounded-full" />
                  <p className="text-sm font-medium">{position}</p>
                  <p className="text-muted-foreground text-xs">
                    {org}
                    {w.location ? ` · ${w.location}` : ''}
                  </p>
                  <p className="text-muted-foreground text-xs">{range}</p>
                  {desc ? (
                    <p className="text-muted-foreground mt-1 text-xs whitespace-pre-line">{desc}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
          {t('certifications')}
        </h3>
        {certifications.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('empty_certs')}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {certifications.map((c) => {
              const name = (locale === 'ar' && c.name_ar) || c.name_en;
              return (
                <Card key={c.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">{name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-muted-foreground text-xs">
                    {c.issuing_org ? <p>{c.issuing_org}</p> : null}
                    {c.issue_date ? <p>{c.issue_date}</p> : null}
                    {c.credential_url ? (
                      <a
                        href={c.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {c.credential_id ?? c.credential_url}
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">{t('awards')}</h3>
        {awards.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('empty_awards')}</p>
        ) : (
          <ul className="space-y-2">
            {awards.map((a) => {
              const name = (locale === 'ar' && a.name_ar) || a.name_en;
              const issuer = (locale === 'ar' && a.issuer_ar) || a.issuer_en;
              const desc = (locale === 'ar' && a.description_ar) || a.description_en;
              return (
                <li key={a.id} className="flex items-start gap-3 text-sm">
                  {a.year ? (
                    <Badge variant="outline" className="mt-0.5 shrink-0">
                      {a.year}
                    </Badge>
                  ) : null}
                  <div className="space-y-0.5">
                    <p className="font-medium">{name}</p>
                    {issuer ? <p className="text-muted-foreground text-xs">{issuer}</p> : null}
                    {desc ? <p className="text-muted-foreground text-xs">{desc}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
