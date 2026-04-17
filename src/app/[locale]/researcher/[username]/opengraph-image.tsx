import { ImageResponse } from 'next/og';
import { fetchProfileByUsername } from '@/lib/profile/fetch';
import type { Locale } from '@/i18n/routing';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface OgImageProps {
  params: { locale: string; username: string };
}

export default async function OgImage({ params }: OgImageProps) {
  const { locale, username } = params;
  const payload = await fetchProfileByUsername(username);

  const typedLocale = locale as Locale;
  const name = payload
    ? typedLocale === 'ar'
      ? payload.profile.full_name_ar
      : payload.profile.full_name_en
    : 'Researcher';

  const titleObj = payload?.profile.academic_title_id
    ? payload.lookups.titleById.get(payload.profile.academic_title_id)
    : null;
  const collegeObj = payload?.profile.college_id
    ? payload.lookups.collegeById.get(payload.profile.college_id)
    : null;
  const title = titleObj ? (typedLocale === 'ar' ? titleObj.name_ar : titleObj.name_en) : null;
  const college = collegeObj
    ? typedLocale === 'ar'
      ? collegeObj.name_ar
      : collegeObj.name_en
    : null;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 80px',
        background: 'linear-gradient(135deg, #1d3a8a 0%, #2563eb 50%, #0ea5e9 100%)',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 22,
          opacity: 0.85,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        University of AL-Turath · RIS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 80, fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
        {title ? <div style={{ fontSize: 36, opacity: 0.9 }}>{title}</div> : null}
        {college ? <div style={{ fontSize: 28, opacity: 0.75 }}>{college}</div> : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 22,
          opacity: 0.85,
        }}
      >
        <span>@{username}</span>
        <span>
          {payload?.profile.scopus_h_index !== null && payload?.profile.scopus_h_index !== undefined
            ? `h-index ${payload.profile.scopus_h_index}`
            : 'Researcher profile'}
        </span>
      </div>
    </div>,
    { ...size },
  );
}
