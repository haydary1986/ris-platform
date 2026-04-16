-- Task 22 — Performance indexes
--
-- Most FK / sort indexes were created inline in the table migrations (16-19).
-- This migration adds the missing GIN indexes for array + full-text columns.
--
-- Indexes already covered:
--   researchers(username)              -- UNIQUE -> implicit btree
--   researchers(college_id)            -- 17_researchers
--   researchers(department_id)         -- 17_researchers
--   researcher_publications(researcher_id, publication_year DESC) -- 19_publications
--   researcher_publications(doi)       -- 19_publications

-- GIN on keywords array (array containment / overlap queries).
CREATE INDEX IF NOT EXISTS idx_publications_keywords_gin
  ON public.researcher_publications USING GIN (keywords);

-- GIN on sdg_goals array (used by /sdg/[number] hub pages).
CREATE INDEX IF NOT EXISTS idx_publications_sdg_goals_gin
  ON public.researcher_publications USING GIN (sdg_goals);

-- Full-text on bios.
--
-- English uses the built-in 'english' config (snowball stemmer).
-- Arabic uses 'simple' because PostgreSQL ships no Arabic stemmer; this still
-- gives whitespace tokenisation + lowercasing, which is good enough for
-- prefix / phrase queries against bio_ar. (A custom config + Snowball Arabic
-- can be wired up later without changing application code.)

CREATE INDEX IF NOT EXISTS idx_researchers_bio_en_fts
  ON public.researchers USING GIN (to_tsvector('english', coalesce(bio_en, '')));

CREATE INDEX IF NOT EXISTS idx_researchers_bio_ar_fts
  ON public.researchers USING GIN (to_tsvector('simple', coalesce(bio_ar, '')));

-- Title search on publications (often the largest text users query).
CREATE INDEX IF NOT EXISTS idx_publications_title_fts
  ON public.researcher_publications USING GIN (to_tsvector('simple', coalesce(title, '')));
