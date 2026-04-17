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

  const {
    profile,
    education,
    work,
    awards,
    publications,
    certifications,
    projects,
    skills,
    languages,
    socials,
    lookups,
  } = payload;
  const isAr = locale === 'ar';
  const t = await getTranslations('profile');

  const name = isAr ? profile.full_name_ar : profile.full_name_en;
  const title = profile.academic_title_id ? lookups.titleById.get(profile.academic_title_id) : null;
  const college = profile.college_id ? lookups.collegeById.get(profile.college_id) : null;
  const dept = profile.department_id ? lookups.departmentById.get(profile.department_id) : null;
  const bio = isAr ? profile.bio_ar : profile.bio_en;
  const interests = isAr ? profile.field_of_interest_ar : profile.field_of_interest_en;
  const degree = isAr ? profile.degree_ar : profile.degree_en;

  const titleName = title ? (isAr ? title.name_ar : title.name_en) : null;
  const collegeName = college ? (isAr ? college.name_ar : college.name_en) : null;
  const deptName = dept ? (isAr ? dept.name_ar : dept.name_en) : null;

  const totalCitations = (profile.scopus_citations_count ?? 0) + (profile.wos_citations_count ?? 0);
  const hIndex = profile.scopus_h_index ?? profile.openalex_h_index ?? 0;

  const scopusLink = socials.find((s) => s.platform === 'scopus')?.url;
  const scholarLink = socials.find((s) => s.platform === 'google_scholar')?.url;
  const orcidLink = socials.find((s) => s.platform === 'orcid')?.url;

  return (
    <article className="cv-root mx-auto max-w-[210mm] bg-white text-zinc-900 print:m-0 print:max-w-none">
      <style>{`
        @page { size: A4; margin: 16mm 18mm; }
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cv-no-print { display: none !important; }
        }
        .cv-root { font-size: 11px; line-height: 1.5; }
        .cv-section-title { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #1e3a5f; margin: 16px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #1e3a5f; }
        .cv-subsection { margin-bottom: 8px; }
        .cv-dot { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #1e3a5f; margin: 0 6px; vertical-align: middle; }
      `}</style>

      {/* Print button */}
      <div className="cv-no-print sticky top-0 z-50 flex items-center justify-between bg-zinc-100 px-6 py-3 print:hidden">
        <span className="text-sm font-medium text-zinc-600">
          {isAr
            ? 'السيرة الذاتية — اضغط Ctrl+P للطباعة أو الحفظ كـ PDF'
            : 'CV — Press Ctrl+P to print or save as PDF'}
        </span>
        <button
          id="cv-print-btn"
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
        >
          {isAr ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
        </button>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'document.getElementById("cv-print-btn")?.addEventListener("click",()=>window.print())',
          }}
        />
      </div>

      <div className="px-10 py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1e3a5f' }}>
                {name}
              </h1>
              {titleName ? (
                <p className="mt-0.5 text-sm font-medium text-zinc-600">{titleName}</p>
              ) : null}
              {(deptName || collegeName) && (
                <p className="text-xs text-zinc-500">
                  {[deptName, collegeName, isAr ? 'جامعة التراث' : 'AL-Turath University']
                    .filter(Boolean)
                    .join(' — ')}
                </p>
              )}
            </div>
            {hIndex > 0 && (
              <div className="text-right">
                <div className="rounded border border-zinc-300 px-3 py-1.5 text-center">
                  <p className="text-lg font-bold" style={{ color: '#1e3a5f' }}>
                    {hIndex}
                  </p>
                  <p className="text-[9px] text-zinc-500">h-index</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-500">
            {profile.public_email ? <span>✉ {profile.public_email}</span> : null}
            {profile.public_phone ? <span>☎ {profile.public_phone}</span> : null}
            {profile.website ? <span>🌐 {profile.website}</span> : null}
            {orcidLink ? <span>ORCID: {orcidLink}</span> : null}
            {scopusLink ? (
              <span>
                Scopus:{' '}
                {scopusLink.replace('https://www.scopus.com/authid/detail.uri?authorId=', 'ID:')}
              </span>
            ) : null}
          </div>

          {/* Metrics bar */}
          {(profile.scopus_publications_count ?? 0) > 0 && (
            <div className="mt-3 flex gap-6 rounded bg-zinc-50 px-4 py-2 text-[10px]">
              {profile.scopus_publications_count ? (
                <div>
                  <span className="font-bold">{profile.scopus_publications_count}</span>{' '}
                  <span className="text-zinc-500">Scopus Pubs</span>
                </div>
              ) : null}
              {totalCitations > 0 ? (
                <div>
                  <span className="font-bold">{totalCitations}</span>{' '}
                  <span className="text-zinc-500">Citations</span>
                </div>
              ) : null}
              {profile.scopus_h_index ? (
                <div>
                  <span className="font-bold">{profile.scopus_h_index}</span>{' '}
                  <span className="text-zinc-500">h-index (Scopus)</span>
                </div>
              ) : null}
              {profile.openalex_h_index ? (
                <div>
                  <span className="font-bold">{profile.openalex_h_index}</span>{' '}
                  <span className="text-zinc-500">h-index (OpenAlex)</span>
                </div>
              ) : null}
            </div>
          )}
        </header>

        {/* Bio */}
        {bio ? (
          <section>
            <h2 className="cv-section-title">{isAr ? 'نبذة عن الباحث' : 'About'}</h2>
            <p className="text-zinc-700 whitespace-pre-line">{bio}</p>
          </section>
        ) : null}

        {/* Research Interests */}
        {interests ? (
          <section>
            <h2 className="cv-section-title">
              {isAr ? 'الاهتمامات البحثية' : 'Research Interests'}
            </h2>
            <p className="text-zinc-700">{interests}</p>
          </section>
        ) : null}

        {/* Education */}
        {education.length > 0 ? (
          <section>
            <h2 className="cv-section-title">{isAr ? 'التحصيل الدراسي' : 'Education'}</h2>
            {education.map((e) => (
              <div key={e.id} className="cv-subsection">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">
                    {e.degree_type}
                    {isAr && e.field_ar ? ` — ${e.field_ar}` : e.field_en ? ` — ${e.field_en}` : ''}
                  </p>
                  {(e.start_year || e.end_year) && (
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {e.start_year ?? ''} – {e.end_year ?? ''}
                    </span>
                  )}
                </div>
                <p className="text-zinc-600">
                  {isAr && e.institution_ar ? e.institution_ar : e.institution_en}
                  {e.country ? `, ${e.country}` : ''}
                </p>
                {e.thesis_title ? (
                  <p className="text-zinc-500 italic">Thesis: {e.thesis_title}</p>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        {/* Work Experience */}
        {work.length > 0 ? (
          <section>
            <h2 className="cv-section-title">
              {isAr ? 'الخبرات المهنية' : 'Professional Experience'}
            </h2>
            {work.map((w) => (
              <div key={w.id} className="cv-subsection">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">{(isAr && w.position_ar) || w.position_en}</p>
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    {w.start_date ?? '?'} –{' '}
                    {w.is_current ? (isAr ? 'حالياً' : 'Present') : (w.end_date ?? '')}
                  </span>
                </div>
                <p className="text-zinc-600">
                  {(isAr && w.organization_ar) || w.organization_en}
                  {w.location ? ` — ${w.location}` : ''}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {/* Publications */}
        {publications.length > 0 ? (
          <section>
            <h2 className="cv-section-title">
              {isAr ? 'المنشورات البحثية' : 'Publications'} ({publications.length})
            </h2>
            <ol className="ms-4 list-decimal space-y-1.5">
              {publications.map((p) => (
                <li key={p.id}>
                  <span className="font-medium">{p.title}</span>
                  {p.journal_name ? (
                    <span className="text-zinc-600">
                      . <em>{p.journal_name}</em>
                    </span>
                  ) : null}
                  {p.publication_year ? (
                    <span className="text-zinc-500"> ({p.publication_year})</span>
                  ) : null}
                  {p.doi ? <span className="text-zinc-400"> doi:{p.doi}</span> : null}
                  {(p.scopus_citations ?? 0) > 0 ? (
                    <span className="text-zinc-500"> — {p.scopus_citations} citations</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Awards */}
        {awards.length > 0 ? (
          <section>
            <h2 className="cv-section-title">{isAr ? 'الجوائز والتكريمات' : 'Awards & Honors'}</h2>
            {awards.map((a) => (
              <div key={a.id} className="cv-subsection">
                <span className="font-medium">{(isAr && a.name_ar) || a.name_en}</span>
                {a.year ? <span className="text-zinc-500"> ({a.year})</span> : null}
                {(isAr ? a.issuer_ar : a.issuer_en) ? (
                  <span className="text-zinc-600"> — {isAr ? a.issuer_ar : a.issuer_en}</span>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        {/* Projects */}
        {projects.length > 0 ? (
          <section>
            <h2 className="cv-section-title">{isAr ? 'المشاريع البحثية' : 'Research Projects'}</h2>
            {projects.map((p) => (
              <div key={p.id} className="cv-subsection">
                <p className="font-semibold">{(isAr && p.title_ar) || p.title_en}</p>
                {p.role ? <span className="text-zinc-600">Role: {p.role}</span> : null}
                {p.funding_agency ? (
                  <span className="text-zinc-500"> — Funded by {p.funding_agency}</span>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        {/* Certifications */}
        {certifications.length > 0 ? (
          <section>
            <h2 className="cv-section-title">{isAr ? 'الشهادات المهنية' : 'Certifications'}</h2>
            {certifications.map((c) => (
              <div key={c.id} className="cv-subsection">
                <span className="font-medium">{(isAr && c.name_ar) || c.name_en}</span>
                {c.issuing_org ? <span className="text-zinc-500"> — {c.issuing_org}</span> : null}
                {c.issue_date ? <span className="text-zinc-500"> ({c.issue_date})</span> : null}
              </div>
            ))}
          </section>
        ) : null}

        {/* Skills & Languages */}
        {(skills.length > 0 || languages.length > 0) && (
          <section>
            <h2 className="cv-section-title">{isAr ? 'المهارات واللغات' : 'Skills & Languages'}</h2>
            {skills.length > 0 && (
              <p className="mb-1">
                <span className="font-medium">{isAr ? 'المهارات: ' : 'Skills: '}</span>
                {skills
                  .map((s) => s.name_en + (s.proficiency ? ` (${s.proficiency})` : ''))
                  .join(' · ')}
              </p>
            )}
            {languages.length > 0 && (
              <p>
                <span className="font-medium">{isAr ? 'اللغات: ' : 'Languages: '}</span>
                {languages.map((l) => `${l.language_name} (${l.proficiency})`).join(' · ')}
              </p>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="mt-8 border-t border-zinc-200 pt-3 text-center text-[9px] text-zinc-400">
          {isAr
            ? `تم إنشاء هذه السيرة الذاتية تلقائياً من نظام RIS — جامعة التراث — ${new Date().toLocaleDateString('ar')}`
            : `Auto-generated from RIS — AL-Turath University — ${new Date().toLocaleDateString('en')}`}
        </footer>
      </div>
    </article>
  );
}
