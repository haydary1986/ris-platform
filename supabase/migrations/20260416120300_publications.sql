-- Task 19 — Researcher publications + co-authors

CREATE TABLE IF NOT EXISTS public.researcher_publications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  researcher_id       uuid NOT NULL REFERENCES public.researchers(id) ON DELETE CASCADE,

  -- Identifiers + classification
  title               text NOT NULL,
  abstract            text,
  publication_type_id uuid REFERENCES public.publication_types(id),
  source_id           uuid REFERENCES public.publication_sources(id),

  -- Venue
  journal_name        text,
  conference_name     text,
  publisher           text,
  volume              text,
  issue               text,
  pages               text,

  -- Dates
  publication_year    smallint,
  publication_date    date,

  -- External IDs
  doi   text,
  isbn  text,
  url   text,

  -- Flags
  is_scopus        boolean NOT NULL DEFAULT false,
  is_wos           boolean NOT NULL DEFAULT false,
  is_open_access   boolean NOT NULL DEFAULT false,
  is_peer_reviewed boolean,

  -- Metrics
  scopus_citations  integer,
  wos_citations     integer,
  scholar_citations integer,

  -- Topics
  -- NOTE FIX-23 (P3): keywords kept as text[] per task spec; can be normalised to
  -- a junction table later if /topic/[slug] perf becomes a problem.
  keywords  text[] NOT NULL DEFAULT '{}',
  sdg_goals smallint[] NOT NULL DEFAULT '{}',

  -- Raw payload from upstream provider (Scopus/WoS/OpenAlex/Scholar)
  raw_data jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- A given researcher should not have two rows with the same DOI
  CONSTRAINT researcher_publications_unique_doi UNIQUE (researcher_id, doi)
);

CREATE INDEX IF NOT EXISTS idx_researcher_publications_researcher_year
  ON public.researcher_publications (researcher_id, publication_year DESC);
CREATE INDEX IF NOT EXISTS idx_researcher_publications_doi
  ON public.researcher_publications (doi);
CREATE INDEX IF NOT EXISTS idx_researcher_publications_source
  ON public.researcher_publications (source_id);

DROP TRIGGER IF EXISTS trg_researcher_publications_set_updated_at ON public.researcher_publications;
CREATE TRIGGER trg_researcher_publications_set_updated_at
  BEFORE UPDATE ON public.researcher_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Co-authors ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.researcher_publication_coauthors (
  publication_id        uuid NOT NULL REFERENCES public.researcher_publications(id) ON DELETE CASCADE,
  author_order          integer NOT NULL CHECK (author_order >= 1),
  author_name           text NOT NULL,
  linked_researcher_id  uuid REFERENCES public.researchers(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (publication_id, author_order)
);

CREATE INDEX IF NOT EXISTS idx_researcher_publication_coauthors_linked
  ON public.researcher_publication_coauthors (linked_researcher_id)
  WHERE linked_researcher_id IS NOT NULL;
