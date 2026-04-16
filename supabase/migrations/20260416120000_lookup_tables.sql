-- Task 16 — Lookup tables + seed data
-- Bilingual reference tables consumed by researchers and publications.

-- Helpers ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Genders ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.genders (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code    text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_ar text NOT NULL
);

INSERT INTO public.genders (code, name_en, name_ar) VALUES
  ('male',   'Male',   'ذكر'),
  ('female', 'Female', 'أنثى')
ON CONFLICT (code) DO NOTHING;

-- Academic titles -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_titles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code    text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  rank    smallint NOT NULL DEFAULT 0
);

INSERT INTO public.academic_titles (code, name_en, name_ar, rank) VALUES
  ('professor',           'Professor',            'أستاذ',                  6),
  ('associate_professor', 'Associate Professor',  'أستاذ مساعد',            5),
  ('assistant_professor', 'Assistant Professor',  'أستاذ مساعد دكتور',      4),
  ('lecturer',            'Lecturer',             'مدرّس',                  3),
  ('assistant_lecturer',  'Assistant Lecturer',   'مدرّس مساعد',             2),
  ('researcher',          'Researcher',           'باحث',                   1)
ON CONFLICT (code) DO NOTHING;

-- Workplace types -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workplace_types (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code    text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_ar text NOT NULL
);

INSERT INTO public.workplace_types (code, name_en, name_ar) VALUES
  ('college',           'College',           'كلية'),
  ('university_center', 'University Center', 'مركز جامعي'),
  ('presidency',        'University Presidency', 'رئاسة الجامعة')
ON CONFLICT (code) DO NOTHING;

-- Colleges --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.colleges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text UNIQUE NOT NULL,
  name_en    text NOT NULL,
  name_ar    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_colleges_set_updated_at ON public.colleges;
CREATE TRIGGER trg_colleges_set_updated_at
  BEFORE UPDATE ON public.colleges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Departments -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  slug       text NOT NULL,
  name_en    text NOT NULL,
  name_ar    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_departments_college_id ON public.departments(college_id);

DROP TRIGGER IF EXISTS trg_departments_set_updated_at ON public.departments;
CREATE TRIGGER trg_departments_set_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- University centers ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.university_centers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text UNIQUE NOT NULL,
  name_en    text NOT NULL,
  name_ar    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_university_centers_set_updated_at ON public.university_centers;
CREATE TRIGGER trg_university_centers_set_updated_at
  BEFORE UPDATE ON public.university_centers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- UN SDG goals ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.un_sdg_goals (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number    smallint UNIQUE NOT NULL CHECK (number BETWEEN 1 AND 17),
  name_en   text NOT NULL,
  name_ar   text NOT NULL,
  color     text NOT NULL,
  icon_url  text
);

INSERT INTO public.un_sdg_goals (number, name_en, name_ar, color) VALUES
  (1,  'No Poverty',                              'القضاء على الفقر',                                   '#E5243B'),
  (2,  'Zero Hunger',                             'القضاء التام على الجوع',                             '#DDA63A'),
  (3,  'Good Health and Well-being',              'الصحة الجيدة والرفاه',                               '#4C9F38'),
  (4,  'Quality Education',                       'التعليم الجيد',                                      '#C5192D'),
  (5,  'Gender Equality',                         'المساواة بين الجنسين',                               '#FF3A21'),
  (6,  'Clean Water and Sanitation',              'المياه النظيفة والنظافة الصحية',                     '#26BDE2'),
  (7,  'Affordable and Clean Energy',             'طاقة نظيفة وبأسعار معقولة',                          '#FCC30B'),
  (8,  'Decent Work and Economic Growth',         'العمل اللائق ونمو الاقتصاد',                         '#A21942'),
  (9,  'Industry, Innovation and Infrastructure', 'الصناعة والابتكار والهياكل الأساسية',                '#FD6925'),
  (10, 'Reduced Inequalities',                    'الحد من أوجه عدم المساواة',                          '#DD1367'),
  (11, 'Sustainable Cities and Communities',      'مدن ومجتمعات محلية مستدامة',                         '#FD9D24'),
  (12, 'Responsible Consumption and Production',  'الاستهلاك والإنتاج المسؤولان',                       '#BF8B2E'),
  (13, 'Climate Action',                          'العمل المناخي',                                      '#3F7E44'),
  (14, 'Life Below Water',                        'الحياة تحت الماء',                                   '#0A97D9'),
  (15, 'Life on Land',                            'الحياة في البر',                                     '#56C02B'),
  (16, 'Peace, Justice and Strong Institutions',  'السلام والعدل والمؤسسات القوية',                     '#00689D'),
  (17, 'Partnerships for the Goals',              'عقد الشراكات لتحقيق الأهداف',                        '#19486A')
ON CONFLICT (number) DO NOTHING;

-- Publication types -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publication_types (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code    text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_ar text NOT NULL
);

INSERT INTO public.publication_types (code, name_en, name_ar) VALUES
  ('journal_article',  'Journal Article',  'مقالة في مجلة'),
  ('conference_paper', 'Conference Paper', 'ورقة مؤتمر'),
  ('book',             'Book',             'كتاب'),
  ('book_chapter',     'Book Chapter',     'فصل في كتاب'),
  ('thesis',           'Thesis',           'أطروحة'),
  ('preprint',         'Preprint',         'ما قبل النشر'),
  ('patent',           'Patent',           'براءة اختراع'),
  ('report',           'Technical Report', 'تقرير تقني'),
  ('other',            'Other',            'أخرى')
ON CONFLICT (code) DO NOTHING;

-- Publication sources ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publication_sources (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

INSERT INTO public.publication_sources (name) VALUES
  ('scopus'),
  ('wos'),
  ('openalex'),
  ('scholar'),
  ('manual')
ON CONFLICT (name) DO NOTHING;
