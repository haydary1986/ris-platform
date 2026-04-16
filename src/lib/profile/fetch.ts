import { createClient } from '@/lib/supabase/server';
import type {
  ResearcherProfile,
  ProfilePayload,
  PublicationRow,
  CoauthorRow,
  EducationRow,
  WorkExperienceRow,
  CertificationRow,
  AwardRow,
  ProjectRow,
  SkillRow,
  LanguageRow,
  SocialProfileRow,
  SdgGoalRow,
  ProfileLookupMaps,
} from './types';

export async function fetchProfileByUsername(username: string): Promise<ProfilePayload | null> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('researchers_public')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error || !profile) return null;

  const id = (profile as ResearcherProfile).id;

  const [
    pubsRes,
    eduRes,
    workRes,
    certsRes,
    awardsRes,
    projectsRes,
    skillsRes,
    langsRes,
    socialsRes,
    sdgsRes,
    collegesRes,
    departmentsRes,
    titlesRes,
    workplaceTypesRes,
    publicationTypesRes,
    publicationSourcesRes,
    sdgGoalsRes,
  ] = await Promise.all([
    supabase
      .from('researcher_publications_public')
      .select('*')
      .eq('researcher_id', id)
      .order('publication_year', { ascending: false }),
    supabase
      .from('researcher_education_public')
      .select('*')
      .eq('researcher_id', id)
      .order('display_order'),
    supabase
      .from('researcher_work_experience_public')
      .select('*')
      .eq('researcher_id', id)
      .order('display_order'),
    supabase
      .from('researcher_certifications_public')
      .select('*')
      .eq('researcher_id', id)
      .order('display_order'),
    supabase
      .from('researcher_awards_public')
      .select('*')
      .eq('researcher_id', id)
      .order('year', { ascending: false }),
    supabase
      .from('researcher_projects_public')
      .select('*')
      .eq('researcher_id', id)
      .order('display_order'),
    supabase
      .from('researcher_skills_public')
      .select('*')
      .eq('researcher_id', id)
      .order('display_order'),
    supabase
      .from('researcher_languages_public')
      .select('*')
      .eq('researcher_id', id)
      .order('display_order'),
    supabase
      .from('researcher_social_profiles_public')
      .select('*')
      .eq('researcher_id', id)
      .order('display_order'),
    supabase.from('researcher_sdg_goals_public').select('*').eq('researcher_id', id),
    supabase.from('colleges').select('id, name_en, name_ar'),
    supabase.from('departments').select('id, name_en, name_ar, college_id'),
    supabase.from('academic_titles').select('id, name_en, name_ar, rank'),
    supabase.from('workplace_types').select('id, name_en, name_ar'),
    supabase.from('publication_types').select('id, name_en, name_ar'),
    supabase.from('publication_sources').select('id, name'),
    supabase.from('un_sdg_goals').select('id, number, name_en, name_ar, color'),
  ]);

  // Coauthors only when there are publications.
  const publicationIds = ((pubsRes.data ?? []) as PublicationRow[]).map((p) => p.id);
  let coauthors: CoauthorRow[] = [];
  if (publicationIds.length > 0) {
    const { data } = await supabase
      .from('researcher_publication_coauthors_public')
      .select('*')
      .in('publication_id', publicationIds);
    coauthors = (data ?? []) as CoauthorRow[];
  }

  const lookups: ProfileLookupMaps = {
    collegeById: new Map((collegesRes.data ?? []).map((c) => [c.id, c])),
    departmentById: new Map((departmentsRes.data ?? []).map((d) => [d.id, d])),
    titleById: new Map((titlesRes.data ?? []).map((t) => [t.id, t])),
    workplaceTypeById: new Map((workplaceTypesRes.data ?? []).map((w) => [w.id, w])),
    publicationTypeById: new Map((publicationTypesRes.data ?? []).map((t) => [t.id, t])),
    publicationSourceById: new Map((publicationSourcesRes.data ?? []).map((s) => [s.id, s])),
    sdgById: new Map((sdgGoalsRes.data ?? []).map((g) => [g.id, g])),
  };

  return {
    profile: profile as ResearcherProfile,
    publications: (pubsRes.data ?? []) as PublicationRow[],
    coauthors,
    education: (eduRes.data ?? []) as EducationRow[],
    work: (workRes.data ?? []) as WorkExperienceRow[],
    certifications: (certsRes.data ?? []) as CertificationRow[],
    awards: (awardsRes.data ?? []) as AwardRow[],
    projects: (projectsRes.data ?? []) as ProjectRow[],
    skills: (skillsRes.data ?? []) as SkillRow[],
    languages: (langsRes.data ?? []) as LanguageRow[],
    socials: (socialsRes.data ?? []) as SocialProfileRow[],
    sdgs: (sdgsRes.data ?? []) as SdgGoalRow[],
    lookups,
  };
}
