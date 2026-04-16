-- Task 21 — Audit log
--
-- Append-only history of admin/researcher mutations on sensitive tables.
-- Triggers that populate it land in Phase 12 (task 126); the table itself
-- only needs to exist now so other code can reference it.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action         text NOT NULL,                         -- insert / update / delete / login / impersonate / ...
  entity_type    text NOT NULL,                         -- 'researcher', 'publication', 'admin', 'app_setting', ...
  entity_id      text,                                  -- text so we can store uuid / int / composite keys uniformly
  before         jsonb,
  after          jsonb,
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_user_id
  ON public.audit_log (actor_user_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);
