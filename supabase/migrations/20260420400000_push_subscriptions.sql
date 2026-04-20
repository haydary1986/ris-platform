-- Web Push subscription registry.
--
-- Each browser → site pairing produces one subscription with:
--   endpoint  — the push service URL the browser exposed
--   p256dh    — the subscriber's EC public key
--   auth      — a random secret the browser mints to authenticate messages
--
-- Sending a push means: POST to endpoint with encrypted body using p256dh+auth.
-- A user can have many subscriptions (different browsers, phones, devices).

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      text NOT NULL,
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  user_agent    text,
  locale        text CHECK (locale IN ('ar','en')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

-- RLS: owners manage their own rows, admins can read everyone (to broadcast
-- via the admin page and to audit who's opted in).
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS push_subs_owner_all ON public.push_subscriptions;
CREATE POLICY push_subs_owner_all ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subs_admin_select ON public.push_subscriptions;
CREATE POLICY push_subs_admin_select ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Broadcast log — record of every admin-initiated push so we have a trail.
CREATE TABLE IF NOT EXISTS public.push_broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  title           text NOT NULL,
  body            text NOT NULL,
  url             text,
  target_locale   text CHECK (target_locale IN ('ar','en','all')),
  recipient_count integer NOT NULL DEFAULT 0,
  success_count   integer NOT NULL DEFAULT 0,
  failure_count   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_broadcasts_created
  ON public.push_broadcasts(created_at DESC);

ALTER TABLE public.push_broadcasts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.push_broadcasts FROM anon, authenticated;
GRANT SELECT, INSERT ON public.push_broadcasts TO authenticated;

DROP POLICY IF EXISTS push_broadcasts_admin_all ON public.push_broadcasts;
CREATE POLICY push_broadcasts_admin_all ON public.push_broadcasts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
