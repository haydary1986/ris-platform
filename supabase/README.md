# Supabase migrations

SQL files in `migrations/` use the Supabase CLI naming convention
`{YYYYMMDDHHmmss}_description.sql`. Each file is idempotent (`IF NOT EXISTS`,
`ON CONFLICT DO NOTHING`) so applying the directory twice is safe.

## Apply order

| #   | File                                               | Phase | Tasks                                  |
| --- | -------------------------------------------------- | ----- | -------------------------------------- |
| 1   | `20260416120000_lookup_tables.sql`                 | 2     | 16                                     |
| 2   | `20260416120100_researchers.sql`                   | 2     | 17                                     |
| 3   | `20260416120200_researcher_child_tables.sql`       | 2     | 18                                     |
| 4   | `20260416120300_publications.sql`                  | 2     | 19                                     |
| 5   | `20260416120400_admins_app_settings.sql`           | 2     | 20                                     |
| 6   | `20260416120500_audit_log.sql`                     | 2     | 21                                     |
| 7   | `20260416120600_performance_indexes.sql`           | 2     | 22                                     |
| 8   | `20260416120700_pg_trgm.sql`                       | 2     | 23                                     |
| 9   | `20260416120800_pgvector.sql`                      | 2     | 24                                     |
| 10  | `20260416121000_storage_buckets.sql`               | 2     | FIX-07                                 |
| 11  | `20260416130000_is_admin.sql`                      | 3     | 32 (FIX-04)                            |
| 12  | `20260416130100_enable_rls.sql`                    | 3     | 25                                     |
| 13  | `20260416130200_revoke_anon_grants.sql`            | 3     | 26                                     |
| 14  | `20260416130300_views.sql`                         | 3     | 27, 28, 31 (FIX-01, FIX-02)            |
| 15  | `20260416130400_policies_researchers.sql`          | 3     | 29 (FIX-03)                            |
| 16  | `20260416130500_policies_child_tables.sql`         | 3     | 30                                     |
| 17  | `20260416130600_policies_admin_audit_settings.sql` | 3     | —                                      |
| 18  | `20260416130700_rpcs.sql`                          | 3     | 33, 34 (FIX-04, FIX-09)                |
| 19  | `20260416140000_enforce_institutional_email.sql`   | 4     | 37 (FIX-05)                            |
| 20  | `20260416140100_link_user_to_researcher.sql`       | 4     | 42 (FIX-06) + pending_profile_claims   |
| 21  | `20260416141000_pagination_extra_filters.sql`      | 6     | extends 33 (workplace + title filters) |
| 22  | `20260417100000_publication_import_rpcs.sql`       | 10    | 103 (Scholar/ORCID/Scopus merge)       |

After applying every migration, run `tests/rls_smoke.sql` (Task 35) against
the same DB to verify anon/authenticated/admin behaviour.

## Provider configuration (manual)

After running the migrations you still need to wire up the OAuth provider
in the Supabase dashboard (Task 36):

1. Google Cloud Console → create OAuth 2.0 Client (Web).
   - Authorised JS origin: `https://yourdomain.com` (+ your staging origin).
   - Authorised redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → Google → enable, paste the
   client ID and secret.
3. Supabase → Authentication → URL Configuration:
   - Site URL: `https://yourdomain.com`
   - Additional redirect URLs: `https://yourdomain.com/auth/callback`,
     `https://staging.yourdomain.com/auth/callback`,
     `http://localhost:3000/auth/callback`.

The `enforce_institutional_email` trigger (FIX-05) will reject any sign-up
whose email isn't in the allowed-domains list. To add or remove a domain,
edit migration `20260416140000_enforce_institutional_email.sql` and re-apply
(`CREATE OR REPLACE FUNCTION` makes the change idempotent).

## How to apply

### Option A — Supabase CLI (recommended)

```bash
# from the repo root, after `supabase link --project-ref <ref>`:
supabase db push
```

### Option B — psql against the production DB

```bash
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

### Option C — Coolify-hosted Postgres

1. Open Coolify → Services → Supabase → Postgres → SQL editor.
2. Paste each file in order; commit between files.

## Verifying RLS

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke.sql
```

The script `SET LOCAL ROLE`s to `anon` and `authenticated`, asserting the
intended behaviour from FIX-01..FIX-04 (security_invoker views, separated
policies with WITH CHECK, RPC search_path hardening).
