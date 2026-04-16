# Supabase migrations

SQL files in `migrations/` use the Supabase CLI naming convention
`{YYYYMMDDHHmmss}_description.sql`. Each file is idempotent (`IF NOT EXISTS`,
`ON CONFLICT DO NOTHING`) so applying the directory twice is safe.

## Apply order

| #   | File                                         | Phase | Tasks |
| --- | -------------------------------------------- | ----- | ----- |
| 1   | `20260416120000_lookup_tables.sql`           | 2     | 16    |
| 2   | `20260416120100_researchers.sql`             | 2     | 17    |
| 3   | `20260416120200_researcher_child_tables.sql` | 2     | 18    |
| 4   | `20260416120300_publications.sql`            | 2     | 19    |
| 5   | `20260416120400_admins_app_settings.sql`     | 2     | 20    |
| 6   | `20260416120500_audit_log.sql`               | 2     | 21    |
| 7   | `20260416120600_performance_indexes.sql`     | 2     | 22    |
| 8   | `20260416120700_pg_trgm.sql`                 | 2     | 23    |
| 9   | `20260416120800_pgvector.sql`                | 2     | 24    |

RLS, views, and policies (Phase 3, tasks 25–35) are intentionally **not**
included here — they require the FIX-01..FIX-07 corrections from
`RIS-Fix-Plan.md` and will arrive in a later migration batch.

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
