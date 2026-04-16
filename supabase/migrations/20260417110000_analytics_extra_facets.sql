-- Extend get_analytics_summary with by_title, by_gender, h_index_distribution.
-- Replaces the Phase 3 version (additive — new fields, old callers just ignore).

DROP FUNCTION IF EXISTS public.get_analytics_summary(integer, integer, uuid);

CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  p_year_from integer DEFAULT NULL,
  p_year_to   integer DEFAULT NULL,
  p_college   uuid    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_min_year int := coalesce(p_year_from, 1900);
  v_max_year int := coalesce(p_year_to,   2100);
BEGIN
  WITH r AS (
    SELECT * FROM public.researchers_public
    WHERE (p_college IS NULL OR college_id = p_college)
  ),
  p AS (
    SELECT pp.*
    FROM public.researcher_publications_public pp
    JOIN r ON r.id = pp.researcher_id
    WHERE pp.publication_year BETWEEN v_min_year AND v_max_year
  )
  SELECT jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_researchers',  (SELECT count(*) FROM r),
      'total_publications', (SELECT count(*) FROM p),
      'total_citations',    (SELECT coalesce(sum(coalesce(scopus_citations,0) + coalesce(wos_citations,0)),0) FROM p),
      'avg_h_index',        (SELECT coalesce(round(avg(coalesce(scopus_h_index, wos_h_index, 0))::numeric, 2), 0) FROM r)
    ),
    'by_year',  (SELECT coalesce(jsonb_object_agg(year, cnt), '{}'::jsonb)
                 FROM (SELECT publication_year AS year, count(*) AS cnt FROM p GROUP BY publication_year ORDER BY publication_year) t),
    'by_source',(SELECT coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
                 FROM (
                   SELECT coalesce(s.name, 'unknown') AS name, count(*) AS cnt
                   FROM p LEFT JOIN public.publication_sources s ON s.id = p.source_id
                   GROUP BY s.name
                 ) t),
    'by_type',  (SELECT coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
                 FROM (
                   SELECT coalesce(t.name_en, 'other') AS name, count(*) AS cnt
                   FROM p LEFT JOIN public.publication_types t ON t.id = p.publication_type_id
                   GROUP BY t.name_en
                 ) tt),
    'by_college', (SELECT coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
                   FROM (
                     SELECT coalesce(c.name_en, 'unaffiliated') AS name, count(*) AS cnt
                     FROM r LEFT JOIN public.colleges c ON c.id = r.college_id
                     GROUP BY c.name_en
                   ) cc),
    'by_title',   (SELECT coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
                   FROM (
                     SELECT coalesce(at.name_en, 'untitled') AS name, count(*) AS cnt
                     FROM r LEFT JOIN public.academic_titles at ON at.id = r.academic_title_id
                     GROUP BY at.name_en
                   ) tt),
    'by_gender',  (SELECT coalesce(jsonb_object_agg(name, cnt), '{}'::jsonb)
                   FROM (
                     SELECT coalesce(g.name_en, 'unspecified') AS name, count(*) AS cnt
                     FROM r LEFT JOIN public.genders g ON g.id = r.gender_id
                     GROUP BY g.name_en
                   ) gg),
    'h_index_distribution', (SELECT coalesce(jsonb_object_agg(bucket, cnt), '{}'::jsonb)
                             FROM (
                               SELECT
                                 CASE
                                   WHEN coalesce(scopus_h_index, 0) BETWEEN 0 AND 5 THEN '0-5'
                                   WHEN coalesce(scopus_h_index, 0) BETWEEN 6 AND 10 THEN '6-10'
                                   WHEN coalesce(scopus_h_index, 0) BETWEEN 11 AND 20 THEN '11-20'
                                   WHEN coalesce(scopus_h_index, 0) BETWEEN 21 AND 40 THEN '21-40'
                                   ELSE '41+'
                                 END AS bucket,
                                 count(*) AS cnt
                               FROM r GROUP BY bucket
                             ) hh),
    'sdg_alignment', (SELECT coalesce(jsonb_object_agg(num, cnt), '{}'::jsonb)
                      FROM (
                        SELECT g.number AS num, count(DISTINCT s.researcher_id) AS cnt
                        FROM public.researcher_sdg_goals s
                        JOIN public.un_sdg_goals g ON g.id = s.sdg_goal_id
                        WHERE s.researcher_id IN (SELECT id FROM r)
                        GROUP BY g.number
                      ) ss)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_analytics_summary(integer, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_analytics_summary(integer, integer, uuid) TO anon, authenticated;
