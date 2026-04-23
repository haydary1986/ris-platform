-- Semantic Scholar MVP — enrich researcher_publications with two fields:
--   * influential_citations  — subset of citation_count that Semantic Scholar
--     flagged as "influential" (paper actually shaped follow-on work, not just
--     a reference dump). Great quality signal on profile + CV.
--   * tldr                   — single-sentence AI summary from SS, rendered
--     under the title so skimmers see the paper's contribution at a glance.
--
-- The public view is SELECT p.*, so it was resolved against the column list
-- at CREATE time and needs to be dropped + recreated to surface the new
-- fields.

ALTER TABLE public.researcher_publications
  ADD COLUMN IF NOT EXISTS influential_citations integer,
  ADD COLUMN IF NOT EXISTS tldr                  text,
  -- When was SS last queried for this row? Lets the enrich job skip rows that
  -- were refreshed recently and re-try the ones that were never touched.
  ADD COLUMN IF NOT EXISTS semantic_scholar_enriched_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_researcher_publications_ss_enriched_at
  ON public.researcher_publications (semantic_scholar_enriched_at NULLS FIRST);

-- Recreate the public view so the new columns are exposed through p.*.
-- Coauthor view depends on the publications view — drop + recreate both.
DROP VIEW IF EXISTS public.researcher_publication_coauthors_public CASCADE;
DROP VIEW IF EXISTS public.researcher_publications_public          CASCADE;

CREATE VIEW public.researcher_publications_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT p.* FROM public.researcher_publications p
WHERE p.researcher_id IN (SELECT id FROM public.researchers_public);

CREATE VIEW public.researcher_publication_coauthors_public
WITH (security_invoker = true, security_barrier = true) AS
SELECT c.* FROM public.researcher_publication_coauthors c
WHERE c.publication_id IN (SELECT id FROM public.researcher_publications_public);

GRANT SELECT ON
  public.researcher_publications_public,
  public.researcher_publication_coauthors_public
TO anon, authenticated;
