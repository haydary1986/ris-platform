// Shared metadata builder for the researcher tab subpages
// (/researcher/{slug}/publications, /projects, /experience, etc.).
//
// Each subpage tweaks the title/description so Google indexes them as
// distinct facets of the researcher, not five copies of the same page.

import type { Metadata } from 'next';
import { fetchProfileByUsername } from './fetch';
import { buildLanguageAlternates, canonicalForLocale } from '@/lib/seo/site';
import type { Locale } from '@/i18n/routing';

export type TabKey = 'publications' | 'projects' | 'experience' | 'thesis' | 'activities';

interface TabCopy {
  ar: { suffix: string; description: string };
  en: { suffix: string; description: string };
}

const TAB_COPY: Record<TabKey, TabCopy> = {
  publications: {
    ar: {
      suffix: 'المنشورات والاقتباسات',
      description:
        'قائمة منشورات الباحث مع المجلات، السنوات، DOI، وعدد الاقتباسات في Scopus وWeb of Science.',
    },
    en: {
      suffix: 'Publications & Citations',
      description:
        "Researcher's publication list with journals, years, DOIs, and citation counts from Scopus and Web of Science.",
    },
  },
  projects: {
    ar: {
      suffix: 'المشاريع البحثية',
      description: 'المشاريع البحثية الممولة للباحث مع جهة التمويل، السنوات، والدور في كل مشروع.',
    },
    en: {
      suffix: 'Research Projects',
      description:
        "Funded research projects with funding agencies, years, and the researcher's role on each project.",
    },
  },
  experience: {
    ar: {
      suffix: 'الخبرات الوظيفية',
      description: 'المسار الأكاديمي للباحث: المؤسسات، المناصب، الشهادات، والتدرج الوظيفي.',
    },
    en: {
      suffix: 'Experience',
      description:
        'Academic career: institutions, positions, certifications, and the progression of the researcher.',
    },
  },
  thesis: {
    ar: {
      suffix: 'الإشراف على الأطاريح',
      description: 'الأطاريح والرسائل التي أشرف عليها الباحث مع أسماء الطلبة والكلية والسنة.',
    },
    en: {
      suffix: 'Thesis Supervision',
      description:
        'Theses and dissertations supervised by the researcher, with student names, college, and year.',
    },
  },
  activities: {
    ar: {
      suffix: 'الأنشطة العلمية',
      description: 'هيئات التحرير، التحكيم، المؤتمرات، وعضويات اللجان والجمعيات العلمية للباحث.',
    },
    en: {
      suffix: 'Academic Activities',
      description:
        'Editorial boards, peer review, conferences, and society memberships of the researcher.',
    },
  },
};

interface BuildArgs {
  locale: Locale;
  username: string;
  tab: TabKey;
}

export async function buildTabMetadata({ locale, username, tab }: BuildArgs): Promise<Metadata> {
  const payload = await fetchProfileByUsername(username);
  if (!payload) return { title: '404' };

  const { profile } = payload;
  const name = locale === 'ar' ? profile.full_name_ar : profile.full_name_en;
  const copy = TAB_COPY[tab][locale];

  const pageTitle = `${name} — ${copy.suffix}`;
  const path = `/researcher/${username}/${tab === 'thesis' ? 'thesis-supervision' : tab}`;
  const alts = buildLanguageAlternates(path);

  return {
    title: pageTitle,
    description: `${copy.description} — ${name}`,
    alternates: {
      canonical: canonicalForLocale(locale, path),
      languages: alts.languages,
    },
    openGraph: {
      type: 'profile',
      title: pageTitle,
      description: copy.description,
      locale,
      images: profile.profile_image ? [{ url: profile.profile_image, alt: name }] : undefined,
    },
  };
}
