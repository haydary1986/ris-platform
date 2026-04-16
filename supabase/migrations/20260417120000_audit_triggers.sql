-- Task 126 — Audit triggers on sensitive tables.
--
-- Every INSERT/UPDATE/DELETE on these tables writes a row into audit_log.
-- Uses SECURITY DEFINER so the trigger function can INSERT into audit_log
-- even when the caller's role normally only has limited grants on it.
-- actor_user_id = auth.uid() at the time of the mutation.

CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_log (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    before,
    after,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN (OLD).id::text ELSE (NEW).id::text END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Apply to every table where mutations should be tracked.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'researchers',
    'researcher_publications',
    'admins',
    'app_settings',
    'colleges',
    'departments',
    'university_centers'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t
    );
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I '
      'AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn()',
      t, t
    );
  END LOOP;
END$$;
