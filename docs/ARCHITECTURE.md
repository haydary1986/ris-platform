# Architecture

## System Overview

```
                    ┌─────────────────┐
                    │   Cloudflare    │
                    │  (DNS + WAF)    │
                    └────────┬────────┘
                             │ HTTPS
                    ┌────────▼────────┐
                    │    Coolify      │
                    │  (Traefik SSL)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐ ┌───▼────┐ ┌───────▼───────┐
     │   ris-web       │ │ Kong   │ │ ris-pipelines │
     │  (Next.js 16)   │ │(API GW)│ │  (Python)     │
     │  Port 3000      │ │Port8000│ │  Prefect      │
     └────────┬────────┘ └───┬────┘ └───────┬───────┘
              │              │              │
              └──────────────┼──────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
     │  PostgreSQL   │ │  GoTrue  │ │  Storage    │
     │  (Supabase)   │ │  (Auth)  │ │  (MinIO)    │
     │  Port 5432    │ │ Port 9999│ │  Port 5000  │
     └───────────────┘ └──────────┘ └─────────────┘
```

## Request Flow

### Public Page (e.g., /en/researcher/alamr)

```
Browser → Cloudflare → Traefik → Next.js proxy.ts
  → next-intl locale routing
  → Supabase session refresh (cookie rotation)
  → Server Component renders
    → createClient() reads cookies
    → supabase.from('researchers_public').select(...)
    → PostgREST → PostgreSQL (RLS applied as anon/authenticated)
    → HTML streamed to browser
```

### Protected Page (e.g., /en/manage-profile)

```
Browser → proxy.ts
  → supabase.auth.getUser() → no session? → 307 to /sign-in
  → session valid → Server Component renders
    → supabase.from('researchers_owner').select(...)
    → RLS: WHERE user_id = auth.uid()
    → Only the owner's row returned
```

### Server Action (e.g., saveBasic)

```
Client form submit → Next.js Server Action
  → Zod validation (server-side)
  → createClient() with user session
  → supabase.from('researchers').update(...)
  → RLS: policy researcher_update_own checks user_id = auth.uid()
  → revalidatePath() → page re-renders with new data
```

## Database Schema

### Core Tables

- `researchers` — 40+ columns, bilingual, public/private contact split
- `researcher_publications` + `researcher_publication_coauthors`
- 9 child tables (education, work, skills, languages, socials, certs, awards, projects, sdg_goals)

### Lookup Tables

- genders, academic_titles, workplace_types, colleges, departments, university_centers, un_sdg_goals, publication_types, publication_sources

### System Tables

- admins (role + scope), app_settings (key/jsonb), audit_log (append-only), sync_state, pending_profile_claims

### Security Layers

| Layer       | Mechanism                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------- |
| Network     | Cloudflare WAF, Traefik TLS                                                                 |
| HTTP        | Security headers (HSTS, X-Frame, etc.)                                                      |
| Application | Zod validation, CSRF protection, PKCE OAuth                                                 |
| Database    | RLS on every table, security_invoker views, SECURITY DEFINER functions with SET search_path |
| Storage     | Per-bucket RLS, MIME/size validation                                                        |

## Data Flow

### Publication Import

```
User uploads .mrhenc → /api/import/scholar
  → Base64 decode → JSON parse → Zod validate
  → Version check (FIX-24)
  → merge_publications RPC (SECURITY INVOKER)
    → Dedupe by DOI then by title+year
    → INSERT new / UPDATE counters on existing
    → Replace coauthors per publication
  → Return {inserted, updated, skipped}
```

### ORCID OAuth (FIX-27)

```
User clicks "Connect ORCID"
  → /api/auth/orcid: generate PKCE + state → httpOnly cookies → redirect to ORCID
  → ORCID authorize → callback with code + state
  → /api/auth/orcid/callback:
    → Delete cookies (one-time use)
    → Verify state (CSRF)
    → Exchange code with PKCE verifier
    → Fetch /works from ORCID API
    → merge_publications RPC
    → Redirect to /manage-profile?import=orcid_ok
```

### Daily Pipeline (Python)

```
Prefect daily_flow (02:00 UTC)
  → scopus_sync (500 researchers, tenacity retry, quota tracking)
  → openalex_sync (free API, polite pool)
  → wos_sync (stub — needs API access)
  → deduplicate (DOI exact + rapidfuzz title, report to app_settings)
  → embed_researchers (multilingual-e5-base 768-dim, incremental)
```

## Key Design Decisions

1. **Next.js 16** — `proxy.ts` replaces `middleware.ts`, `params` are Promise-based
2. **shadcn Nova preset** — uses `@base-ui/react` (not Radix), no `asChild`, use `render={}` or `buttonVariants()`
3. **Keyset pagination** — O(log n) at any depth, no OFFSET/LIMIT degradation
4. **security_invoker views** — prevents the most common Supabase RLS bypass
5. **Self-hosted everything** — no vendor lock-in, data sovereignty for Iraqi university data
6. **ICU MessageFormat** — full Arabic plural support (6 forms)
