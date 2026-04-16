-- Task 20 — App settings + admins
--
-- Note: this migration intentionally does NOT define RLS policies. Phase 3
-- (tasks 25–35, including FIX-03/04) is the dedicated security pass.

-- App settings ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  description text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

DROP TRIGGER IF EXISTS trg_app_settings_set_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_settings (key, value, description) VALUES
  ('homepage.show_scopus_wos_stats', 'true'::jsonb, 'Toggle Scopus & WoS metrics on the homepage stats block.'),
  ('directory.default_page_size',    '20'::jsonb,   'Default page size for the public researcher directory.'),
  ('directory.allow_anonymous',      'true'::jsonb, 'Allow anon (signed-out) users to browse the directory.')
ON CONFLICT (key) DO NOTHING;

-- Admins ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('super_admin','college_admin','department_admin')),
  scope_id    uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- A scoped admin must declare a scope; super_admin must NOT carry one.
  CONSTRAINT admins_scope_consistency CHECK (
    (role = 'super_admin' AND scope_id IS NULL)
    OR (role IN ('college_admin','department_admin') AND scope_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_admins_role     ON public.admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_scope_id ON public.admins(scope_id) WHERE scope_id IS NOT NULL;
