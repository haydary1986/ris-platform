import { JsonLd } from './json-ld';
import type { Locale } from '@/i18n/routing';
import type { ProfilePayload } from '@/lib/profile/types';

// Task 75 — Person JSON-LD on the researcher profile page.
export function PersonSchema({
  payload,
  locale,
  profileUrl,
}: {
  payload: ProfilePayload;
  locale: Locale;
  profileUrl: string;
}) {
  const { profile, lookups, education, socials } = payload;
  const name = locale === 'ar' ? profile.full_name_ar : profile.full_name_en;
  const title = profile.academic_title_id ? lookups.titleById.get(profile.academic_title_id) : null;
  const college = profile.college_id ? lookups.collegeById.get(profile.college_id) : null;

  const knowsAbout = (locale === 'ar' ? profile.field_of_interest_ar : profile.field_of_interest_en)
    ?.split(/[,،;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const sameAs = socials.map((s) => s.url).filter(Boolean);

  const alumniOf = education.map((e) => ({
    '@type': 'EducationalOrganization',
    name: locale === 'ar' && e.institution_ar ? e.institution_ar : e.institution_en,
  }));

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': profileUrl,
        name,
        url: profileUrl,
        jobTitle: title ? (locale === 'ar' ? title.name_ar : title.name_en) : undefined,
        affiliation: {
          '@type': 'CollegeOrUniversity',
          name: college
            ? `${locale === 'ar' ? college.name_ar : college.name_en}, University of AL-Turath`
            : 'University of AL-Turath',
        },
        image: profile.profile_image ?? undefined,
        sameAs: sameAs.length > 0 ? sameAs : undefined,
        knowsAbout: knowsAbout && knowsAbout.length > 0 ? knowsAbout : undefined,
        alumniOf: alumniOf.length > 0 ? alumniOf : undefined,
      }}
    />
  );
}
