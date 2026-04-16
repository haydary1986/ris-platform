import { getTranslations } from 'next-intl/server';
import { Pencil, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { QrCodeButton } from './qr-code-button';
import { CvDownloadButton } from './cv-download-button';
import type { Locale } from '@/i18n/routing';
import type { ProfilePayload, ResearcherProfile } from '@/lib/profile/types';

interface ProfileHeroProps {
  payload: ProfilePayload;
  locale: Locale;
  isOwner: boolean;
  profileUrl: string;
}

function pickName<T extends { name_en: string; name_ar: string } | undefined>(
  item: T,
  locale: Locale,
): string | null {
  if (!item) return null;
  return locale === 'ar' ? item.name_ar : item.name_en;
}

function pickField(
  profile: ResearcherProfile,
  enKey: keyof ResearcherProfile,
  arKey: keyof ResearcherProfile,
  locale: Locale,
): string | null {
  const value = profile[locale === 'ar' ? arKey : enKey];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function ProfileHero({ payload, locale, isOwner, profileUrl }: ProfileHeroProps) {
  const t = await getTranslations('profile');
  const { profile, sdgs, lookups } = payload;

  const name = locale === 'ar' ? profile.full_name_ar : profile.full_name_en;
  const title = pickName(
    profile.academic_title_id ? lookups.titleById.get(profile.academic_title_id) : undefined,
    locale,
  );
  const college = pickName(
    profile.college_id ? lookups.collegeById.get(profile.college_id) : undefined,
    locale,
  );
  const department = pickName(
    profile.department_id ? lookups.departmentById.get(profile.department_id) : undefined,
    locale,
  );
  const degree = pickField(profile, 'degree_en', 'degree_ar', locale);
  const initial = name.slice(0, 1);

  return (
    <section className="border-b">
      <div className="container mx-auto flex flex-col gap-6 px-4 py-10 md:flex-row md:items-start">
        <Avatar className="size-32 shrink-0 self-center md:self-start">
          {profile.profile_image ? <AvatarImage src={profile.profile_image} alt="" /> : null}
          <AvatarFallback className="text-3xl">{initial}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3 text-center md:text-start">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
            {title ? <p className="text-muted-foreground mt-1">{title}</p> : null}
          </div>

          {(department || college) && (
            <p className="text-muted-foreground text-sm">
              {[department, college].filter(Boolean).join(' · ')}
            </p>
          )}

          {degree ? <p className="text-muted-foreground text-sm italic">{degree}</p> : null}

          {sdgs.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
              {sdgs
                .map((s) => lookups.sdgById.get(s.sdg_goal_id))
                .filter((g): g is NonNullable<typeof g> => Boolean(g))
                .sort((a, b) => a.number - b.number)
                .map((g) => (
                  <Badge
                    key={g.id}
                    style={{ backgroundColor: g.color, color: 'white' }}
                    className="border-0"
                  >
                    SDG {g.number}
                  </Badge>
                ))}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Globe className="size-4" />
                {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            ) : null}
            <CvDownloadButton username={profile.username} label={t('download_cv')} />
            <QrCodeButton url={profileUrl} title={t('qr_title')} share={t('share')} />
            {isOwner ? (
              <Link
                href="/manage-profile"
                className={buttonVariants({ variant: 'default', size: 'sm' })}
              >
                <Pencil className="size-4" />
                {t('edit')}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
