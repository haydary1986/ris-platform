// Task 70 — Print-friendly CV page.
//
// FIX-11 calls for Puppeteer + Arabic-shaping fonts to ship a real PDF binary.
// That's a ~150 MB Chromium dependency in the container, so we ship a print-
// optimised HTML page first: the user hits Cmd/Ctrl+P → "Save as PDF" and gets
// a clean A4 document. Bonded fonts (Cairo for AR, Inter for EN) are already
// loaded by the locale layout, so Arabic shaping is correct in the browser.
//
// Upgrade path when a PDF service is available:
//   1. Set PDF_RENDERER_URL=https://your-puppeteer-service.example.com
//   2. Replace this page with a Route Handler that fetches its own URL,
//      POSTs the HTML to the renderer, and streams the PDF response back.

import { setRequestLocale, getTranslations } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { fetchProfileByUsername } from '@/lib/profile/fetch';
import { routing, type Locale } from '@/i18n/routing';

interface CvPageProps {
  params: Promise<{ locale: string; username: string }>;
}

export const dynamic = 'force-dynamic';

export default async function CvPage({ params }: CvPageProps) {
  const { locale, username } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const payload = await fetchProfileByUsername(username);
  if (!payload) notFound();

  const { profile, education, work, awards, publications, lookups } = payload;
  const typedLocale = locale as Locale;
  const t = await getTranslations('profile');
  const tOv = await getTranslations('profile.overview');

  const name = typedLocale === 'ar' ? profile.full_name_ar : profile.full_name_en;
  const title = profile.academic_title_id ? lookups.titleById.get(profile.academic_title_id) : null;
  const college = profile.college_id ? lookups.collegeById.get(profile.college_id) : null;
  const dept = profile.department_id ? lookups.departmentById.get(profile.department_id) : null;
  const bio = typedLocale === 'ar' ? profile.bio_ar : profile.bio_en;

  return (
    <article className="cv-page mx-auto max-w-3xl bg-white px-10 py-12 text-zinc-900">
      <style>{`
        @page { size: A4; margin: 18mm; }
        @media print {
          body { background: white !important; }
          .cv-no-print { display: none !important; }
        }
        .cv-page h2 { font-size: 0.9rem; letter-spacing: 0.08em; text-transform: uppercase; color: #475569; margin: 1.5rem 0 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.25rem; }
      `}</style>

      <header className="border-b border-zinc-300 pb-4">
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        {title ? (
          <p className="mt-1 text-base text-zinc-600">
            {typedLocale === 'ar' ? title.name_ar : title.name_en}
          </p>
        ) : null}
        {(dept || college) && (
          <p className="text-sm text-zinc-500">
            {[
              dept ? (typedLocale === 'ar' ? dept.name_ar : dept.name_en) : null,
              college ? (typedLocale === 'ar' ? college.name_ar : college.name_en) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          {profile.public_email ? <span>{profile.public_email}</span> : null}
          {profile.public_phone ? <span>{profile.public_phone}</span> : null}
          {profile.website ? <span>{profile.website}</span> : null}
        </div>
      </header>

      {bio ? (
        <section>
          <h2>{tOv('biography')}</h2>
          <p className="text-sm whitespace-pre-line">{bio}</p>
        </section>
      ) : null}

      {education.length > 0 ? (
        <section>
          <h2>{tOv('education')}</h2>
          <ul className="space-y-2 text-sm">
            {education.map((e) => {
              const inst =
                typedLocale === 'ar' && e.institution_ar ? e.institution_ar : e.institution_en;
              const field = typedLocale === 'ar' ? e.field_ar : e.field_en;
              return (
                <li key={e.id}>
                  <p className="font-medium">
                    {e.degree_type.toUpperCase()}
                    {field ? ` · ${field}` : ''}
                  </p>
                  <p className="text-zinc-600">
                    {inst}
                    {e.country ? ` · ${e.country}` : ''}
                    {e.start_year || e.end_year
                      ? ` · ${e.start_year ?? ''} – ${e.end_year ?? ''}`
                      : ''}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {work.length > 0 ? (
        <section>
          <h2>{t('experience')}</h2>
          <ul className="space-y-2 text-sm">
            {work.map((w) => {
              const position = (typedLocale === 'ar' && w.position_ar) || w.position_en;
              const org = (typedLocale === 'ar' && w.organization_ar) || w.organization_en;
              return (
                <li key={w.id}>
                  <p className="font-medium">{position}</p>
                  <p className="text-zinc-600">
                    {org}
                    {w.location ? ` · ${w.location}` : ''}
                    {' · '}
                    {w.start_date ?? '?'} – {w.is_current ? '…' : (w.end_date ?? '…')}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {awards.length > 0 ? (
        <section>
          <h2>{t('experience').includes('Award') ? 'Awards' : 'الجوائز'}</h2>
          <ul className="space-y-1 text-sm">
            {awards.map((a) => (
              <li key={a.id}>
                {a.year ? <span className="text-zinc-500">{a.year} · </span> : null}
                {(typedLocale === 'ar' && a.name_ar) || a.name_en}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {publications.length > 0 ? (
        <section>
          <h2>{t('publications')}</h2>
          <ol className="ms-5 list-decimal space-y-1 text-sm">
            {publications.slice(0, 50).map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.title}</span>
                {p.publication_year ? (
                  <span className="text-zinc-500"> ({p.publication_year})</span>
                ) : null}
                {p.journal_name ? <span className="text-zinc-600"> · {p.journal_name}</span> : null}
                {p.doi ? <span className="text-zinc-500"> · doi:{p.doi}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
