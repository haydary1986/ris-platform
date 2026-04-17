# Security Policy

## Supported Versions

| Version       | Supported |
| ------------- | --------- |
| latest (main) | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue.
2. Email: **claude@uoturath.edu.iq** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (if any)
3. You will receive a response within **48 hours**.
4. A fix will be deployed within **7 days** for critical issues.

## Security Architecture

### Database (PostgreSQL + Supabase)

- **Row Level Security (RLS)** enabled on every table (24 tables)
- **Views** use `security_invoker = true` + `security_barrier = true` to prevent RLS bypass
- **Policies** separated per operation (SELECT/INSERT/UPDATE/DELETE) with `WITH CHECK` on writes
- **`is_admin()`** function uses `SECURITY DEFINER` with `SET search_path = public, pg_temp`
- **Anon role** has no direct table access — only via views + RPCs
- **`audit_log`** is append-only (no UPDATE/DELETE policies)

### Authentication

- Google OAuth via Supabase GoTrue
- Institutional email restriction via DB trigger (not auth hook — FIX-05)
- ORCID OAuth with PKCE (S256) + CSRF state + httpOnly cookies (FIX-27)
- Session refresh in Next.js proxy (cookie rotation)
- Protected routes enforced at proxy level + server component level (defense in depth)

### Input Validation

- Zod schemas on client (react-hook-form) + server (server actions) — double validation
- UUID allow-list on URL params (prevents injection via filter params)
- Base64 decode + Zod envelope validation on .mrhenc upload (FIX-24 version check)

### HTTP Security

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Open redirect prevention on OAuth callbacks (allow-list regex)

### Storage

- Supabase Storage with per-bucket RLS (FIX-07)
- Upload path: `{bucket}/{user_id}/{filename}` — RLS prevents cross-user writes
- MIME type + file size enforced at bucket level + client level
- Avatars bucket: public read, owner-only write (2 MB, PNG/JPEG/WEBP)

### Secrets

- `SUPABASE_SERVICE_ROLE_KEY` never reaches the browser (server-only)
- `ORCID_CLIENT_SECRET` and `SCOPUS_API_KEY` server-only
- `.env*` in .gitignore (except .env.example)
- No secrets in Docker build args (placeholder values used)

## Known Limitations

- **CSP with nonce** (FIX-26): documented but not yet enforced — recommended to add via Cloudflare WAF rules
- **Rate limiting** (FIX-19): documented for Cloudflare or @upstash/ratelimit — not enforced in-app yet
- **MFA for admins** (FIX-17): Supabase supports TOTP MFA but the admin UI enforcement is deferred
