-- Task 18 — Child tables of researchers (CASCADE on delete)

-- Social profiles -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_social_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  platform      text NOT NULL,                       -- orcid, google_scholar, scopus, wos, researchgate, linkedin, github, x, website
  username      text,
  url           text NOT NULL,
  is_verified   boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (researcher_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_researcher_social_profiles_researcher_id ON public.researcher_social_profiles(researcher_id);

DROP TRIGGER IF EXISTS trg_researcher_social_profiles_set_updated_at ON public.researcher_social_profiles;
CREATE TRIGGER trg_researcher_social_profiles_set_updated_at
  BEFORE UPDATE ON public.researcher_social_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Skills ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_skills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  name_en       text NOT NULL,
  name_ar       text,
  proficiency   text CHECK (proficiency IN ('beginner','intermediate','advanced','expert')),
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_researcher_skills_researcher_id ON public.researcher_skills(researcher_id);

DROP TRIGGER IF EXISTS trg_researcher_skills_set_updated_at ON public.researcher_skills;
CREATE TRIGGER trg_researcher_skills_set_updated_at
  BEFORE UPDATE ON public.researcher_skills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Languages -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_languages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  language_code text NOT NULL,                       -- ISO 639-1 (en, ar, fr, ...)
  language_name text NOT NULL,
  proficiency   text NOT NULL CHECK (proficiency IN ('A1','A2','B1','B2','C1','C2','native')),
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (researcher_id, language_code)
);

CREATE INDEX IF NOT EXISTS idx_researcher_languages_researcher_id ON public.researcher_languages(researcher_id);

DROP TRIGGER IF EXISTS trg_researcher_languages_set_updated_at ON public.researcher_languages;
CREATE TRIGGER trg_researcher_languages_set_updated_at
  BEFORE UPDATE ON public.researcher_languages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Education -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_education (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id   uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  degree_type     text NOT NULL,                      -- phd, msc, bsc, postdoc, ...
  field_en        text,
  field_ar        text,
  institution_en  text NOT NULL,
  institution_ar  text,
  country         text,
  start_year      smallint,
  end_year        smallint,
  thesis_title    text,
  supervisor      text,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_researcher_education_researcher_id ON public.researcher_education(researcher_id);

DROP TRIGGER IF EXISTS trg_researcher_education_set_updated_at ON public.researcher_education;
CREATE TRIGGER trg_researcher_education_set_updated_at
  BEFORE UPDATE ON public.researcher_education
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Work experience -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_work_experience (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id   uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  position_en     text NOT NULL,
  position_ar     text,
  organization_en text NOT NULL,
  organization_ar text,
  location        text,
  start_date      date,
  end_date        date,
  is_current      boolean NOT NULL DEFAULT false,
  description_en  text,
  description_ar  text,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_researcher_work_experience_researcher_id ON public.researcher_work_experience(researcher_id);

DROP TRIGGER IF EXISTS trg_researcher_work_experience_set_updated_at ON public.researcher_work_experience;
CREATE TRIGGER trg_researcher_work_experience_set_updated_at
  BEFORE UPDATE ON public.researcher_work_experience
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Certifications --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_certifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id  uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  name_en        text NOT NULL,
  name_ar        text,
  issuing_org    text,
  issue_date     date,
  expiry_date    date,
  credential_id  text,
  credential_url text,
  display_order  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_researcher_certifications_researcher_id ON public.researcher_certifications(researcher_id);

DROP TRIGGER IF EXISTS trg_researcher_certifications_set_updated_at ON public.researcher_certifications;
CREATE TRIGGER trg_researcher_certifications_set_updated_at
  BEFORE UPDATE ON public.researcher_certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Awards ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_awards (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id  uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  name_en        text NOT NULL,
  name_ar        text,
  issuer_en      text,
  issuer_ar      text,
  year           smallint,
  description_en text,
  description_ar text,
  display_order  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_researcher_awards_researcher_id ON public.researcher_awards(researcher_id);

DROP TRIGGER IF EXISTS trg_researcher_awards_set_updated_at ON public.researcher_awards;
CREATE TRIGGER trg_researcher_awards_set_updated_at
  BEFORE UPDATE ON public.researcher_awards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Projects --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id  uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  title_en       text NOT NULL,
  title_ar       text,
  description_en text,
  description_ar text,
  role           text,                                -- pi, co_pi, member, ...
  funding_agency text,
  funding_amount numeric(14,2),
  currency       text DEFAULT 'USD',
  start_date     date,
  end_date       date,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','planned','paused')),
  url            text,
  display_order  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_researcher_projects_researcher_id ON public.researcher_projects(researcher_id);

DROP TRIGGER IF EXISTS trg_researcher_projects_set_updated_at ON public.researcher_projects;
CREATE TRIGGER trg_researcher_projects_set_updated_at
  BEFORE UPDATE ON public.researcher_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SDG goals (junction) --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_sdg_goals (
  researcher_id  uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,
  sdg_goal_id    uuid NOT NULL REFERENCES public.un_sdg_goals(id) ON DELETE CASCADE,
  alignment      text CHECK (alignment IN ('primary','secondary')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (researcher_id, sdg_goal_id)
);

CREATE INDEX IF NOT EXISTS idx_researcher_sdg_goals_sdg_goal_id ON public.researcher_sdg_goals(sdg_goal_id);
