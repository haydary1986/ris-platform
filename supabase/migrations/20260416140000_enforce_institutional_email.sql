-- Task 37 + FIX-05 (P0) — Enforce institutional email at signup
--
-- The original task spec relied on a Supabase "before-user-created" auth
-- hook that does NOT exist. Real Supabase hooks are limited to:
--   send-email, send-sms, custom-access-token, mfa-verification-attempt,
--   password-verification-attempt.
--
-- We use a BEFORE INSERT trigger on auth.users instead. Caveat: the failure
-- surfaces to the client as HTTP 500 from the auth API; the sign-in UI
-- (task 38) translates that to a user-friendly toast.
--
-- Escape hatch: an admin can pre-seed `raw_user_meta_data->>'invited_by_admin'
-- = 'true'` on a manually-issued invite to bypass the domain check
-- (e.g., external collaborators).

CREATE OR REPLACE FUNCTION public.enforce_institutional_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  allowed_domains text[] := ARRAY['uoturath.edu.iq'];
  email_domain    text;
BEGIN
  -- Admin-invited accounts skip the domain check.
  IF NEW.raw_user_meta_data->>'invited_by_admin' = 'true' THEN
    RETURN NEW;
  END IF;

  email_domain := lower(split_part(NEW.email, '@', 2));

  IF NOT (email_domain = ANY (allowed_domains)) THEN
    RAISE EXCEPTION
      'Email domain "%" is not allowed. Use your institutional email.',
      email_domain
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_institutional_email_trigger ON auth.users;

CREATE TRIGGER enforce_institutional_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_institutional_email();
