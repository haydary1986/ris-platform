import { getTranslations } from 'next-intl/server';
import { Mail, Phone, MapPin, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Locale } from '@/i18n/routing';
import type { ProfilePayload } from '@/lib/profile/types';

interface TabOverviewProps {
  payload: ProfilePayload;
  locale: Locale;
}

function localized<T extends { name_en: string; name_ar: string | null }>(
  item: T,
  locale: Locale,
): string {
  return (locale === 'ar' && item.name_ar) || item.name_en;
}

export async function TabOverview({ payload, locale }: TabOverviewProps) {
  const t = await getTranslations('profile.overview');
  const tHidden = await getTranslations('profile');
  const { profile, skills, languages, socials, education, sdgs, lookups } = payload;

  const bio = locale === 'ar' ? profile.bio_ar : profile.bio_en;
  const interests = locale === 'ar' ? profile.field_of_interest_ar : profile.field_of_interest_en;

  const hasContact =
    profile.public_email ||
    profile.public_phone ||
    profile.public_office_location ||
    profile.public_office_hours;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {bio ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('biography')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm whitespace-pre-line">{bio}</p>
            </CardContent>
          </Card>
        ) : null}

        {interests ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('interests')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{interests}</p>
            </CardContent>
          </Card>
        ) : null}

        {education.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('education')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {education.map((e) => {
                const inst =
                  locale === 'ar' && e.institution_ar ? e.institution_ar : e.institution_en;
                const field = locale === 'ar' ? e.field_ar : e.field_en;
                const range = [e.start_year, e.end_year].filter(Boolean).join(' – ');
                return (
                  <div key={e.id} className="text-sm">
                    <p className="font-medium">
                      {e.degree_type.toUpperCase()}
                      {field ? ` · ${field}` : ''}
                    </p>
                    <p className="text-muted-foreground">
                      {inst}
                      {e.country ? ` · ${e.country}` : ''}
                      {range ? ` · ${range}` : ''}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-6">
        {socials.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('socials')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {socials.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="size-3.5" />
                      <span className="capitalize">{s.platform.replace(/_/g, ' ')}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {skills.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('skills')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <Badge key={s.id} variant="secondary">
                    {localized(s, locale)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {languages.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('languages')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {languages.map((l) => (
                  <li key={l.id} className="flex items-center justify-between">
                    <span>{l.language_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {l.proficiency}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {sdgs.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('sdg_alignment')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {sdgs
                  .map((s) => lookups.sdgById.get(s.sdg_goal_id))
                  .filter((g): g is NonNullable<typeof g> => Boolean(g))
                  .sort((a, b) => a.number - b.number)
                  .map((g) => (
                    <li key={g.id} className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.number}. {locale === 'ar' ? g.name_ar : g.name_en}
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('contact')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {hasContact ? (
              <ul className="space-y-2">
                {profile.public_email ? (
                  <li className="flex items-center gap-2">
                    <Mail className="text-muted-foreground size-4 shrink-0" />
                    <a
                      href={`mailto:${profile.public_email}`}
                      className="text-primary hover:underline break-all"
                    >
                      {profile.public_email}
                    </a>
                  </li>
                ) : null}
                {profile.public_phone ? (
                  <li className="flex items-center gap-2">
                    <Phone className="text-muted-foreground size-4 shrink-0" />
                    <span className="break-all">{profile.public_phone}</span>
                  </li>
                ) : null}
                {profile.public_office_location ? (
                  <li className="flex items-start gap-2">
                    <MapPin className="text-muted-foreground size-4 shrink-0" />
                    <span>{profile.public_office_location}</span>
                  </li>
                ) : null}
                {profile.public_office_hours ? (
                  <li className="flex items-start gap-2">
                    <Clock className="text-muted-foreground size-4 shrink-0" />
                    <span>{profile.public_office_hours}</span>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-muted-foreground text-xs">{tHidden('contact_hidden')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
