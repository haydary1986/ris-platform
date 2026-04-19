// Builds the system prompt for the AI assistant. For a directory with
// ~40 researchers we pass every public profile as context — no RAG needed.
// Result is cached in-memory for 10 minutes so we aren't hammering the DB
// on every chat message.

import { createClient } from '@/lib/supabase/server';

interface ResearcherRow {
  username: string | null;
  full_name_en: string | null;
  full_name_ar: string | null;
  degree_en: string | null;
  degree_ar: string | null;
  field_of_interest_en: string | null;
  field_of_interest_ar: string | null;
  bio_en: string | null;
  bio_ar: string | null;
  scopus_h_index: number | null;
  scopus_publications_count: number | null;
}

interface ContextCache {
  en: string;
  ar: string;
  fetchedAt: number;
}

const TTL_MS = 10 * 60 * 1000;
let cache: ContextCache | null = null;

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n).trim() + '…' : s;
}

function buildResearcherLine(r: ResearcherRow, locale: 'ar' | 'en'): string {
  const name =
    locale === 'ar' ? r.full_name_ar || r.full_name_en : r.full_name_en || r.full_name_ar;
  const degree = locale === 'ar' ? r.degree_ar || r.degree_en : r.degree_en || r.degree_ar;
  const interests =
    locale === 'ar'
      ? r.field_of_interest_ar || r.field_of_interest_en
      : r.field_of_interest_en || r.field_of_interest_ar;
  const bio = locale === 'ar' ? r.bio_ar || r.bio_en : r.bio_en || r.bio_ar;
  const url = r.username ? `/${locale}/researcher/${r.username}` : '';
  const metrics: string[] = [];
  if (r.scopus_h_index) metrics.push(`h-index:${r.scopus_h_index}`);
  if (r.scopus_publications_count) metrics.push(`pubs:${r.scopus_publications_count}`);

  const fields: string[] = [];
  if (name) fields.push(`Name: ${name}`);
  if (url) fields.push(`URL: ${url}`);
  if (degree) fields.push(`Degree: ${truncate(degree, 80)}`);
  if (interests) fields.push(`Interests: ${truncate(interests, 200)}`);
  if (bio) fields.push(`Bio: ${truncate(bio, 400)}`);
  if (metrics.length) fields.push(`Metrics: ${metrics.join(', ')}`);
  return `- ${fields.join(' | ')}`;
}

async function loadResearchers(): Promise<ResearcherRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('researchers_public')
    .select(
      'username, full_name_en, full_name_ar, degree_en, degree_ar, field_of_interest_en, field_of_interest_ar, bio_en, bio_ar, scopus_h_index, scopus_publications_count',
    )
    .limit(500);
  return (data as ResearcherRow[] | null) ?? [];
}

export async function getSystemPrompt(locale: 'ar' | 'en'): Promise<string> {
  const now = Date.now();
  if (!cache || now - cache.fetchedAt > TTL_MS) {
    const rows = await loadResearchers();
    const en = rows.map((r) => buildResearcherLine(r, 'en')).join('\n');
    const ar = rows.map((r) => buildResearcherLine(r, 'ar')).join('\n');
    cache = { en, ar, fetchedAt: now };
  }

  const listing = locale === 'ar' ? cache.ar : cache.en;

  const arInstructions = `أنت مساعد دليل باحثي جامعة التراث (RIS). مهمّتك مساعدة الزوار على إيجاد الباحثين المناسبين لاهتماماتهم.

القائمة الكاملة للباحثين المتاحين علنياً (هذه هي مصدر المعرفة الوحيد — لا تخترع أسماء ولا تفترض معلومات خارجها):

${listing}

قواعد مهمة:
- أجب باللغة العربية.
- اقتبس أسماء الباحثين حرفياً كما في القائمة.
- أضف الرابط بصيغة markdown حين تذكر باحثاً: [الاسم](URL).
- إذا لم تجد تطابقاً دقيقاً، اقترح أقرب الباحثين اهتماماً مع توضيح أنّهم قد لا يكونون تطابقاً كاملاً.
- كن موجزاً — جملتان إلى أربع جمل ثم قائمة الباحثين.
- لا تتحدّث عن مواضيع خارج نطاق دليل الباحثين هذا.`;

  const enInstructions = `You are the AL-Turath University Researcher Information System (RIS) assistant. Help visitors find researchers matching their interests.

Full list of publicly-available researchers (this is your ONLY knowledge source — never invent names or details):

${listing}

Rules:
- Reply in English.
- Quote researcher names exactly as listed.
- Link each researcher with markdown: [Name](URL).
- If no exact match, suggest the closest by interests and say so.
- Be concise — 2–4 sentences then a bulleted list.
- Do not discuss topics outside this researcher directory.`;

  return locale === 'ar' ? arInstructions : enInstructions;
}
