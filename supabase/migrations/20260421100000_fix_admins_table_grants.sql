-- Fix: "permission denied for table admins" when a super-admin tries to
-- add or remove another admin from /admin/admins.
--
-- Cause: the earlier revoke-and-regrant migration only re-granted SELECT
-- on public.admins to the authenticated role. The addAdmin / removeAdmin
-- server actions use the regular (authenticated) Supabase client, so the
-- INSERT/DELETE hit the missing GRANT before ever reaching the admin-only
-- RLS policies.
--
-- RLS still gates writes (admin_insert + admin_delete policies require
-- is_admin()), so re-granting here is safe.

GRANT INSERT, UPDATE, DELETE ON public.admins TO authenticated;
