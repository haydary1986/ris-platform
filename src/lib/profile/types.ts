export interface ResearcherProfile {
  id: string;
  username: string;
  full_name_en: string;
  full_name_ar: string;
  bio_en: string | null;
  bio_ar: string | null;
  profile_image: string | null;
  degree_en: string | null;
  degree_ar: string | null;
  field_of_interest_en: string | null;
  field_of_interest_ar: string | null;
  website: string | null;
  college_id: string | null;
  department_id: string | null;
  workplace_type_id: string | null;
  academic_title_id: string | null;
  university_center_id: string | null;
  scopus_h_index: number | null;
  scopus_publications_count: number | null;
  scopus_citations_count: number | null;
  wos_h_index: number | null;
  wos_publications_count: number | null;
  wos_citations_count: number | null;
  openalex_h_index: number | null;
  openalex_publications_count: number | null;
  openalex_citations_count: number | null;
  public_email: string | null;
  public_phone: string | null;
  public_office_location: string | null;
  public_office_hours: string | null;
  public_mailing_address: string | null;
  updated_at: string;
}

export interface PublicationRow {
  id: string;
  researcher_id: string;
  title: string;
  abstract: string | null;
  publication_type_id: string | null;
  source_id: string | null;
  journal_name: string | null;
  conference_name: string | null;
  publisher: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publication_year: number | null;
  publication_date: string | null;
  doi: string | null;
  isbn: string | null;
  url: string | null;
  is_scopus: boolean;
  is_wos: boolean;
  is_open_access: boolean;
  is_peer_reviewed: boolean | null;
  scopus_citations: number | null;
  wos_citations: number | null;
  scholar_citations: number | null;
  keywords: string[] | null;
  sdg_goals: number[] | null;
}

export interface CoauthorRow {
  publication_id: string;
  author_order: number;
  author_name: string;
  linked_researcher_id: string | null;
}

export interface EducationRow {
  id: string;
  degree_type: string;
  field_en: string | null;
  field_ar: string | null;
  institution_en: string;
  institution_ar: string | null;
  country: string | null;
  start_year: number | null;
  end_year: number | null;
  thesis_title: string | null;
  supervisor: string | null;
  display_order: number;
}

export interface WorkExperienceRow {
  id: string;
  position_en: string;
  position_ar: string | null;
  organization_en: string;
  organization_ar: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description_en: string | null;
  description_ar: string | null;
  display_order: number;
}

export interface CertificationRow {
  id: string;
  name_en: string;
  name_ar: string | null;
  issuing_org: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id: string | null;
  credential_url: string | null;
  display_order: number;
}

export interface AwardRow {
  id: string;
  name_en: string;
  name_ar: string | null;
  issuer_en: string | null;
  issuer_ar: string | null;
  year: number | null;
  description_en: string | null;
  description_ar: string | null;
  display_order: number;
}

export interface ProjectRow {
  id: string;
  title_en: string;
  title_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  role: string | null;
  funding_agency: string | null;
  funding_amount: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'completed' | 'planned' | 'paused';
  url: string | null;
  display_order: number;
}

export interface SkillRow {
  id: string;
  name_en: string;
  name_ar: string | null;
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  display_order: number;
}

export interface LanguageRow {
  id: string;
  language_code: string;
  language_name: string;
  proficiency: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';
  display_order: number;
}

export interface SocialProfileRow {
  id: string;
  platform: string;
  username: string | null;
  url: string;
  is_verified: boolean;
  display_order: number;
}

export interface SdgGoalRow {
  researcher_id: string;
  sdg_goal_id: string;
  alignment: 'primary' | 'secondary' | null;
}

export interface BilingualLookup {
  id: string;
  name_en: string;
  name_ar: string;
}

export interface DepartmentLookup extends BilingualLookup {
  college_id: string;
}

export interface AcademicTitleLookup extends BilingualLookup {
  rank: number;
}

export interface PublicationSourceLookup {
  id: string;
  name: string;
}

export interface SdgLookup {
  id: string;
  number: number;
  name_en: string;
  name_ar: string;
  color: string;
}

export interface ProfileLookupMaps {
  collegeById: Map<string, BilingualLookup>;
  departmentById: Map<string, DepartmentLookup>;
  titleById: Map<string, AcademicTitleLookup>;
  workplaceTypeById: Map<string, BilingualLookup>;
  publicationTypeById: Map<string, BilingualLookup>;
  publicationSourceById: Map<string, PublicationSourceLookup>;
  sdgById: Map<string, SdgLookup>;
}

export interface ProfilePayload {
  profile: ResearcherProfile;
  publications: PublicationRow[];
  coauthors: CoauthorRow[];
  education: EducationRow[];
  work: WorkExperienceRow[];
  certifications: CertificationRow[];
  awards: AwardRow[];
  projects: ProjectRow[];
  skills: SkillRow[];
  languages: LanguageRow[];
  socials: SocialProfileRow[];
  sdgs: SdgGoalRow[];
  lookups: ProfileLookupMaps;
}
