-- Tasks 103, 104, 105 — Publication import RPCs (Scholar, ORCID, Scopus).
--
-- One generic merge function powers all three providers because the dedupe
-- + insert logic is identical:
--   1. Caller passes p_researcher_id + array of publication objects.
--   2. SECURITY INVOKER means RLS rejects writes to anyone else's rows
--      (researcher_publications.owner_insert/update policies).
--   3. Dedupe by DOI (exact, normalized lower-case) first; if no DOI, try
--      title + publication_year exact match.
--   4. Returns {inserted, updated, skipped} so the UI can report.
--
-- Provider-specific wrappers preset the source_id and add Scholar/WoS/etc.
-- flags so callers don't have to know lookup IDs.

CREATE OR REPLACE FUNCTION public.merge_publications(
  p_researcher_id uuid,
  p_publications  jsonb,
  p_source_name   text DEFAULT 'manual'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source_id  uuid;
  v_inserted   integer := 0;
  v_updated    integer := 0;
  v_skipped    integer := 0;
  v_pub        jsonb;
  v_doi        text;
  v_title      text;
  v_year       integer;
  v_existing_id uuid;
  v_authors    jsonb;
BEGIN
  IF jsonb_typeof(p_publications) <> 'array' THEN
    RAISE EXCEPTION 'p_publications must be a JSON array';
  END IF;

  SELECT id INTO v_source_id FROM public.publication_sources WHERE name = p_source_name;
  IF v_source_id IS NULL THEN
    RAISE EXCEPTION 'unknown source: %', p_source_name;
  END IF;

  FOR v_pub IN SELECT * FROM jsonb_array_elements(p_publications)
  LOOP
    v_title := nullif(trim(v_pub->>'title'), '');
    IF v_title IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_doi  := nullif(lower(trim(v_pub->>'doi')), '');
    v_year := nullif(v_pub->>'publication_year', '')::integer;

    -- Dedupe step 1: DOI match.
    v_existing_id := NULL;
    IF v_doi IS NOT NULL THEN
      SELECT id INTO v_existing_id
        FROM public.researcher_publications
       WHERE researcher_id = p_researcher_id
         AND lower(doi) = v_doi
       LIMIT 1;
    END IF;

    -- Dedupe step 2: title + year exact (normalised whitespace).
    IF v_existing_id IS NULL THEN
      SELECT id INTO v_existing_id
        FROM public.researcher_publications
       WHERE researcher_id = p_researcher_id
         AND lower(regexp_replace(title, '\s+', ' ', 'g')) = lower(regexp_replace(v_title, '\s+', ' ', 'g'))
         AND publication_year IS NOT DISTINCT FROM v_year
       LIMIT 1;
    END IF;

    IF v_existing_id IS NOT NULL THEN
      -- Update only the citation counters and provider flags; the human-edited
      -- fields (title casing, abstract, journal name) stay as-is.
      UPDATE public.researcher_publications
         SET scopus_citations = coalesce((v_pub->>'scopus_citations')::integer, scopus_citations),
             wos_citations    = coalesce((v_pub->>'wos_citations')::integer, wos_citations),
             scholar_citations = coalesce((v_pub->>'scholar_citations')::integer, scholar_citations),
             is_open_access   = coalesce((v_pub->>'is_open_access')::boolean, is_open_access),
             is_scopus        = is_scopus OR (p_source_name = 'scopus'),
             is_wos           = is_wos    OR (p_source_name = 'wos'),
             raw_data         = coalesce(raw_data, '{}'::jsonb) || jsonb_build_object(p_source_name, v_pub),
             updated_at       = now()
       WHERE id = v_existing_id;
      v_updated := v_updated + 1;
    ELSE
      INSERT INTO public.researcher_publications (
        researcher_id, source_id, title, abstract,
        journal_name, conference_name, publisher,
        volume, issue, pages,
        publication_year, doi, isbn, url,
        is_scopus, is_wos, is_open_access,
        scopus_citations, wos_citations, scholar_citations,
        keywords, raw_data
      ) VALUES (
        p_researcher_id,
        v_source_id,
        v_title,
        v_pub->>'abstract',
        v_pub->>'journal_name',
        v_pub->>'conference_name',
        v_pub->>'publisher',
        v_pub->>'volume',
        v_pub->>'issue',
        v_pub->>'pages',
        v_year,
        v_doi,
        v_pub->>'isbn',
        v_pub->>'url',
        p_source_name = 'scopus',
        p_source_name = 'wos',
        coalesce((v_pub->>'is_open_access')::boolean, false),
        nullif(v_pub->>'scopus_citations', '')::integer,
        nullif(v_pub->>'wos_citations', '')::integer,
        nullif(v_pub->>'scholar_citations', '')::integer,
        coalesce(
          (SELECT array_agg(value::text) FROM jsonb_array_elements_text(coalesce(v_pub->'keywords', '[]'::jsonb))),
          ARRAY[]::text[]
        ),
        jsonb_build_object(p_source_name, v_pub)
      )
      RETURNING id INTO v_existing_id;
      v_inserted := v_inserted + 1;
    END IF;

    -- Co-authors (replace-all per publication when caller provides them).
    v_authors := v_pub->'authors';
    IF jsonb_typeof(v_authors) = 'array' AND jsonb_array_length(v_authors) > 0 THEN
      DELETE FROM public.researcher_publication_coauthors WHERE publication_id = v_existing_id;
      INSERT INTO public.researcher_publication_coauthors (publication_id, author_order, author_name)
        SELECT v_existing_id, ord::integer, value
          FROM jsonb_array_elements_text(v_authors) WITH ORDINALITY AS t(value, ord);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated',  v_updated,
    'skipped',  v_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_publications(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merge_publications(uuid, jsonb, text) TO authenticated;

-- Convenience wrappers per provider — same shape, different defaults.
CREATE OR REPLACE FUNCTION public.update_researcher_publications_google_scholar(
  p_researcher_id uuid,
  p_publications  jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT public.merge_publications(p_researcher_id, p_publications, 'scholar');
$$;

REVOKE ALL ON FUNCTION public.update_researcher_publications_google_scholar(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_researcher_publications_google_scholar(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_researcher_publications_orcid(
  p_researcher_id uuid,
  p_publications  jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT public.merge_publications(p_researcher_id, p_publications, 'openalex');  -- no dedicated 'orcid' source row; ORCID-discovered works are openalex-typed
$$;

REVOKE ALL ON FUNCTION public.update_researcher_publications_orcid(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_researcher_publications_orcid(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_researcher_publications_scopus(
  p_researcher_id uuid,
  p_publications  jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT public.merge_publications(p_researcher_id, p_publications, 'scopus');
$$;

REVOKE ALL ON FUNCTION public.update_researcher_publications_scopus(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_researcher_publications_scopus(uuid, jsonb) TO authenticated;
