'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  academicSchema,
  awardSchema,
  basicSchema,
  certSchema,
  contactSchema,
  educationSchema,
  projectSchema,
  publicationSchema,
  researchSchema,
  visibilitySchema,
  type BasicInput,
  type AcademicInput,
  type ResearchInput,
  type ContactInput,
  type VisibilityInput,
  type EducationInput,
  type WorkInput,
  type CertInput,
  type AwardInput,
  type ProjectInput,
  type PublicationInput,
} from './schemas';
import { workSchema } from './schemas';

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function ownResearcherId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from('researchers_owner').select('id').maybeSingle();
  return data?.id ?? null;
}

function flatten(zodErr: import('zod').ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of zodErr.issues) {
    const key = issue.path.join('.') || '_root';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// ---------- Researchers main row ----------
async function updateResearcher(patch: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createClient();
  const id = await ownResearcherId();
  if (!id) return { ok: false, error: 'no_profile' };

  const { error } = await supabase.from('researchers').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/[locale]/researcher/[username]', 'page');
  revalidatePath('/[locale]/manage-profile', 'page');
  return { ok: true };
}

export async function saveBasic(input: BasicInput): Promise<ActionResult> {
  const parsed = basicSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error) };
  return updateResearcher(parsed.data);
}

export async function saveAcademic(input: AcademicInput): Promise<ActionResult> {
  const parsed = academicSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error) };
  return updateResearcher(parsed.data);
}

export async function saveContact(input: ContactInput): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error) };
  return updateResearcher(parsed.data);
}

export async function saveVisibility(input: VisibilityInput): Promise<ActionResult> {
  const parsed = visibilitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error) };
  return updateResearcher(parsed.data);
}

// ---------- Research tab — also touches child arrays ----------
function parseSkillsCsv(csv: string | undefined): string[] {
  if (!csv) return [];
  return Array.from(
    new Set(
      csv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

interface ParsedLanguage {
  language_code: string;
  language_name: string;
  proficiency: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
}

function parseLanguagesCsv(csv: string | undefined): ParsedLanguage[] {
  if (!csv) return [];
  const allowed = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native']);
  return csv
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [code, level] = chunk.split(':').map((s) => s.trim());
      if (!code || !level || !allowed.has(level)) return null;
      return {
        language_code: code,
        language_name: code,
        proficiency: level as ParsedLanguage['proficiency'],
      };
    })
    .filter((x): x is ParsedLanguage => Boolean(x));
}

interface ParsedSocial {
  platform: string;
  url: string;
}

function parseSocialsBlock(block: string | undefined): ParsedSocial[] {
  if (!block) return [];
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [platform, ...urlParts] = line.split('|').map((s) => s.trim());
      const url = urlParts.join('|');
      if (!platform || !url || !/^https?:\/\//.test(url)) return null;
      return { platform: platform.toLowerCase(), url };
    })
    .filter((x): x is ParsedSocial => Boolean(x));
}

export async function saveResearch(input: ResearchInput): Promise<ActionResult> {
  const parsed = researchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error) };

  const supabase = await createClient();
  const id = await ownResearcherId();
  if (!id) return { ok: false, error: 'no_profile' };

  const main = await supabase
    .from('researchers')
    .update({
      bio_en: parsed.data.bio_en ?? null,
      bio_ar: parsed.data.bio_ar ?? null,
      field_of_interest_en: parsed.data.field_of_interest_en ?? null,
      field_of_interest_ar: parsed.data.field_of_interest_ar ?? null,
      website: parsed.data.website ?? null,
    })
    .eq('id', id);
  if (main.error) return { ok: false, error: main.error.message };

  // Replace-all pattern for child arrays.
  const skills = parseSkillsCsv(parsed.data.skills_csv);
  const langs = parseLanguagesCsv(parsed.data.languages_csv);
  const socials = parseSocialsBlock(parsed.data.socials_block);

  await supabase.from('researcher_skills').delete().eq('researcher_id', id);
  if (skills.length > 0) {
    await supabase.from('researcher_skills').insert(
      skills.map((name, idx) => ({
        researcher_id: id,
        name_en: name,
        display_order: idx,
      })),
    );
  }

  await supabase.from('researcher_languages').delete().eq('researcher_id', id);
  if (langs.length > 0) {
    await supabase.from('researcher_languages').insert(
      langs.map((l, idx) => ({
        researcher_id: id,
        ...l,
        display_order: idx,
      })),
    );
  }

  await supabase.from('researcher_social_profiles').delete().eq('researcher_id', id);
  if (socials.length > 0) {
    await supabase.from('researcher_social_profiles').insert(
      socials.map((s, idx) => ({
        researcher_id: id,
        ...s,
        display_order: idx,
      })),
    );
  }

  revalidatePath('/[locale]/researcher/[username]', 'page');
  return { ok: true };
}

// ---------- Child rows (Experience tab) ----------
async function upsertChild<T extends { id?: string }>(
  table:
    | 'researcher_education'
    | 'researcher_work_experience'
    | 'researcher_certifications'
    | 'researcher_awards'
    | 'researcher_projects',
  schema:
    | typeof educationSchema
    | typeof workSchema
    | typeof certSchema
    | typeof awardSchema
    | typeof projectSchema,
  input: T,
): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error) };

  const supabase = await createClient();
  const id = await ownResearcherId();
  if (!id) return { ok: false, error: 'no_profile' };

  const data = parsed.data as Record<string, unknown> & { id?: string };
  const rowId = data.id;
  delete data.id;

  if (rowId) {
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', rowId)
      .eq('researcher_id', id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from(table).insert({ ...data, researcher_id: id });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/[locale]/researcher/[username]', 'page');
  return { ok: true };
}

async function deleteChild(
  table:
    | 'researcher_education'
    | 'researcher_work_experience'
    | 'researcher_certifications'
    | 'researcher_awards'
    | 'researcher_projects'
    | 'researcher_publications',
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const ownerId = await ownResearcherId();
  if (!ownerId) return { ok: false, error: 'no_profile' };
  const { error } = await supabase.from(table).delete().eq('id', id).eq('researcher_id', ownerId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/[locale]/researcher/[username]', 'page');
  return { ok: true };
}

export async function saveEducation(input: EducationInput): Promise<ActionResult> {
  return upsertChild('researcher_education', educationSchema, input);
}

export async function deleteEducation(id: string): Promise<ActionResult> {
  return deleteChild('researcher_education', id);
}

export async function saveWork(input: WorkInput): Promise<ActionResult> {
  return upsertChild('researcher_work_experience', workSchema, input);
}

export async function deleteWork(id: string): Promise<ActionResult> {
  return deleteChild('researcher_work_experience', id);
}

export async function saveCert(input: CertInput): Promise<ActionResult> {
  return upsertChild('researcher_certifications', certSchema, input);
}

export async function deleteCert(id: string): Promise<ActionResult> {
  return deleteChild('researcher_certifications', id);
}

export async function saveAward(input: AwardInput): Promise<ActionResult> {
  return upsertChild('researcher_awards', awardSchema, input);
}

export async function deleteAward(id: string): Promise<ActionResult> {
  return deleteChild('researcher_awards', id);
}

export async function saveProject(input: ProjectInput): Promise<ActionResult> {
  return upsertChild('researcher_projects', projectSchema, input);
}

export async function deleteProject(id: string): Promise<ActionResult> {
  return deleteChild('researcher_projects', id);
}

// ---------- Publications ----------
export async function savePublication(input: PublicationInput): Promise<ActionResult> {
  const parsed = publicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: flatten(parsed.error) };

  const supabase = await createClient();
  const id = await ownResearcherId();
  if (!id) return { ok: false, error: 'no_profile' };

  const { authors, ...row } = parsed.data;
  const { data: pub, error } = await supabase
    .from('researcher_publications')
    .insert({ ...row, researcher_id: id })
    .select('id')
    .single();
  if (error || !pub) return { ok: false, error: error?.message ?? 'insert_failed' };

  if (authors) {
    const list = authors
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length > 0) {
      await supabase.from('researcher_publication_coauthors').insert(
        list.map((author_name, idx) => ({
          publication_id: pub.id,
          author_name,
          author_order: idx + 1,
        })),
      );
    }
  }

  revalidatePath('/[locale]/researcher/[username]', 'page');
  return { ok: true };
}

export async function deletePublication(id: string): Promise<ActionResult> {
  return deleteChild('researcher_publications', id);
}

export async function saveBasicOnboarding(input: {
  full_name_en: string;
  full_name_ar: string;
  college_id: string;
  department_id: string;
  academic_title_id: string;
}): Promise<ActionResult> {
  const rid = await ownResearcherId();
  if (!rid) return { ok: false, error: 'No profile found' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('researchers')
    .update({
      full_name_en: input.full_name_en,
      full_name_ar: input.full_name_ar,
      college_id: input.college_id,
      department_id: input.department_id,
      academic_title_id: input.academic_title_id,
    })
    .eq('id', rid);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}
