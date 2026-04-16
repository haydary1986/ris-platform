-- Task 23 — pg_trgm for fuzzy name search
--
-- Trigram indexes work on raw Unicode text — language-agnostic — so the same
-- pattern serves both Latin and Arabic names.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_researchers_full_name_en_trgm
  ON public.researchers USING GIN (full_name_en gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_researchers_full_name_ar_trgm
  ON public.researchers USING GIN (full_name_ar gin_trgm_ops);

-- Username searches benefit too (admin lookups by partial handle).
CREATE INDEX IF NOT EXISTS idx_researchers_username_trgm
  ON public.researchers USING GIN (username gin_trgm_ops);
