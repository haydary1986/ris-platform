-- Task 17 — Researchers (master profile table)

CREATE TABLE IF NOT EXISTS public.researchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth link (nullable until the user signs in; populated by FIX-06 trigger)
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Identity
  username    text UNIQUE NOT NULL,
  full_name_en text NOT NULL,
  full_name_ar text NOT NULL,
  employee_id  text UNIQUE,
  gender_id              uuid REFERENCES public.genders(id),
  academic_title_id      uuid REFERENCES public.academic_titles(id),
  workplace_type_id      uuid REFERENCES public.workplace_types(id),
  college_id             uuid REFERENCES public.colleges(id),
  department_id          uuid REFERENCES public.departments(id),
  university_center_id   uuid REFERENCES public.university_centers(id),

  -- Academic background
  degree_en        text,
  degree_ar        text,
  degree_minor_en  text,
  degree_minor_ar  text,
  birthdate        date,

  -- Bio + research
  bio_en                 text,
  bio_ar                 text,
  field_of_interest_en   text,
  field_of_interest_ar   text,

  -- Public assets
  profile_image text,
  website       text,

  -- Contact (private = admin only; public = visible iff show_public_contact)
  private_email           text,
  private_phone           text,
  private_office_location text,
  private_office_hours    text,
  private_mailing_address text,

  public_email            text,
  public_phone            text,
  public_office_location  text,
  public_office_hours     text,
  public_mailing_address  text,

  show_public_contact boolean NOT NULL DEFAULT false,

  -- Visibility
  is_public                  boolean NOT NULL DEFAULT false,
  admin_visibility_override  text CHECK (admin_visibility_override IN ('force_show','force_hide')),

  -- Bibliometrics — Scopus
  scopus_h_index             integer,
  scopus_publications_count  integer,
  scopus_citations_count     integer,

  -- Bibliometrics — Web of Science
  wos_h_index                integer,
  wos_publications_count     integer,
  wos_citations_count        integer,

  -- Bibliometrics — OpenAlex
  openalex_h_index           integer,
  openalex_publications_count integer,
  openalex_citations_count   integer,

  -- Sync state
  scopus_last_synced_at   timestamptz,
  wos_last_synced_at      timestamptz,
  openalex_last_synced_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT researchers_username_format CHECK (username ~ '^[a-z0-9][a-z0-9_-]{1,63}$')
);

CREATE INDEX IF NOT EXISTS idx_researchers_college_id    ON public.researchers(college_id);
CREATE INDEX IF NOT EXISTS idx_researchers_department_id ON public.researchers(department_id);
CREATE INDEX IF NOT EXISTS idx_researchers_is_public     ON public.researchers(is_public) WHERE is_public = true;

DROP TRIGGER IF EXISTS trg_researchers_set_updated_at ON public.researchers;
CREATE TRIGGER trg_researchers_set_updated_at
  BEFORE UPDATE ON public.researchers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
