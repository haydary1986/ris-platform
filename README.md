<p align="center">
  <h1 align="center">RIS — Researcher Information System</h1>
  <p align="center">
    <strong>نظام معلومات الباحثين — جامعة التراث</strong>
  </p>
  <p align="center">
    A bilingual (EN/AR) research directory platform with publication tracking, analytics, and SEO-optimized researcher profiles.
  </p>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-self--hosted-3ecf8e?logo=supabase" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-v4-06b6d4?logo=tailwindcss" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## Features

- **Bilingual UI** — Full English + Arabic with RTL support, Cairo/Inter fonts
- **Researcher Directory** — Search, filter (college/dept/title/workplace), keyset pagination
- **Researcher Profiles** — 6-tab layout (Overview, Publications, Projects, Experience, Thesis, Activities) + QR code + CV download
- **Publication Import** — Google Scholar (browser extension + console script), ORCID (OAuth + PKCE), Scopus API
- **Analytics Dashboard** — 10+ interactive Recharts (line, pie, bar, treemap, histogram, SDG grid) + export PNG/Excel/PDF
- **Admin Panel** — Manage admins, researcher visibility, homepage settings, audit log, colleges CRUD, setup guide
- **SEO** — Dynamic meta + OG images, JSON-LD (Person, Organization, ScholarlyArticle, BreadcrumbList), sitemap with chunking, robots.txt, hreflang, legacy URL redirects, IndexNow
- **Security** — RLS on every table, security_invoker views, PKCE OAuth, CSRF protection, security headers, input validation (Zod)
- **AI-Ready** — pgvector embeddings (768-dim), semantic search RPC, similar researchers, co-authorship graph

## Tech Stack

| Layer          | Technology                                                               |
| -------------- | ------------------------------------------------------------------------ |
| Frontend       | Next.js 16, React 19, TypeScript (strict), Tailwind v4, shadcn/ui (Nova) |
| Backend        | Next.js Server Components + Server Actions, Supabase PostgREST           |
| Database       | PostgreSQL 16 + pgvector + pg_trgm                                       |
| Auth           | Supabase GoTrue (Google OAuth)                                           |
| Storage        | Supabase Storage (S3-compatible)                                         |
| i18n           | next-intl (EN/AR, ICU MessageFormat)                                     |
| Charts         | Recharts                                                                 |
| Forms          | react-hook-form + Zod                                                    |
| Monitoring     | Sentry (optional)                                                        |
| Data Pipelines | Python + Prefect + sentence-transformers                                 |
| CI/CD          | GitHub Actions + Docker                                                  |
| Deployment     | Coolify (self-hosted)                                                    |

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+
- Git

### Development

```bash
# Clone
git clone https://github.com/haydary1986/ris-platform.git
cd ris-platform

# Install
npm install

# Environment (copy and fill in values)
cp .env.example .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The app runs without Supabase connected — pages render with empty states
> and auth redirects to sign-in. Connect Supabase to unlock full functionality.

### Scripts

| Command             | Description                  |
| ------------------- | ---------------------------- |
| `npm run dev`       | Start dev server (Turbopack) |
| `npm run build`     | Production build             |
| `npm start`         | Start production server      |
| `npm run lint`      | ESLint                       |
| `npm run format`    | Prettier format all          |
| `npm run typecheck` | TypeScript strict check      |
| `npm test`          | Run unit tests (Vitest)      |
| `npm run test:e2e`  | Run E2E tests (Playwright)   |

## Project Structure

```
ris-platform/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # Locale-wrapped pages
│   │   │   ├── (landing)       # Homepage sections
│   │   │   ├── researchers/    # Directory
│   │   │   ├── researcher/     # Profile + CV + OG image
│   │   │   ├── analytics/      # Charts dashboard
│   │   │   ├── admin/          # Admin panel (6 sub-pages)
│   │   │   ├── manage-profile/ # Profile editor + import
│   │   │   ├── sign-in/        # Auth
│   │   │   ├── search/         # Semantic search
│   │   │   ├── collaborations/ # Co-authorship graph
│   │   │   └── college|department|sdg|topic|publication|year/
│   │   ├── api/                # Route handlers (health, import, ORCID)
│   │   ├── auth/               # OAuth callback
│   │   ├── sitemap.xml/        # Sitemap index
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/                 # shadcn (20+ components)
│   │   ├── layout/             # Header, Footer, LanguageSwitcher, UserMenu
│   │   ├── landing/            # Hero, Stats, FeaturedResearchers, Mission, SDG
│   │   ├── researchers/        # Card, Skeleton, Search, Sort, Filter, Pagination
│   │   ├── profile/            # Hero, Tabs, Overview, Publications, Projects...
│   │   ├── analytics/          # 8 chart components + export
│   │   ├── manage/             # Form tabs, ImageUpload, VisibilityToggle
│   │   ├── import/             # Scholar, ORCID, Scopus sections
│   │   └── seo/                # JSON-LD, Breadcrumbs
│   ├── lib/
│   │   ├── supabase/           # client.ts, server.ts, admin.ts
│   │   ├── directory/          # types, URL helpers
│   │   ├── profile/            # fetch, types
│   │   ├── manage/             # Zod schemas, server actions
│   │   ├── admin/              # server actions
│   │   ├── seo/                # site helpers, IndexNow
│   │   └── import/             # Scholar console script
│   ├── i18n/                   # routing, request, navigation
│   ├── hooks/                  # useUnsavedChanges
│   └── proxy.ts                # Next.js 16 middleware (intl + auth + guards)
├── messages/                   # en.json, ar.json (500+ keys each)
├── supabase/
│   ├── migrations/             # 30 SQL files (schema + RLS + RPCs + triggers)
│   └── tests/                  # RLS smoke test
├── pipelines/                  # Python data sync + embeddings
│   ├── pipelines/jobs/         # scopus, openalex, wos, dedup, embed
│   ├── pipelines/flows/        # Prefect daily flow
│   └── Dockerfile
├── browser-extension/          # Chrome MV3 Scholar importer
├── docs/
│   ├── SETUP-REQUIREMENTS.md   # Full setup checklist
│   └── ARCHITECTURE.md         # System design (see below)
├── tests/
│   ├── unit/                   # Vitest
│   └── e2e/                    # Playwright
├── .github/workflows/          # CI + Docker build
├── Dockerfile                  # 3-stage production build
└── next.config.ts              # withNextIntl + withSentry + security headers
```

## Database

30 SQL migrations, applied in order. Key tables:

- **9 lookup tables** — genders, academic_titles, colleges, departments, SDG goals...
- **researchers** — master profile (40+ columns, bilingual, public/private contact split)
- **9 child tables** — education, work, skills, languages, socials, projects, awards, certs, SDG goals
- **researcher_publications** + coauthors — with DOI dedup + keywords array
- **admins** + app_settings + audit_log + sync_state + pending_profile_claims

### Security (RLS)

- RLS enabled on **every** table
- Views with `security_invoker = true` (FIX-01/02 — prevents RLS bypass)
- Policies separated per operation with `WITH CHECK` (FIX-03)
- `is_admin()` SECURITY DEFINER with `SET search_path` (FIX-04)
- Anon can only read via public views + RPCs — never direct table access

## Deployment

See [docs/SETUP-REQUIREMENTS.md](docs/SETUP-REQUIREMENTS.md) for the complete guide.

### TL;DR

1. VPS (8 vCPU, 16 GB RAM, Ubuntu 22.04)
2. Install Coolify: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
3. Deploy Supabase from Coolify template
4. Apply 30 SQL migrations
5. Deploy this app from GitHub (Dockerfile)
6. Add env vars in Coolify
7. Point DNS via Cloudflare
8. Open `/admin/setup` to verify all services

**No paid subscriptions required.** Everything is self-hosted and open source.

## Environment Variables

See [.env.example](.env.example) for all variables. Required:

```
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://api-ris.yourdomain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Optional: `SENTRY_DSN`, `ORCID_CLIENT_ID/SECRET`, `SCOPUS_API_KEY`, `GOOGLE_SITE_VERIFICATION`, `INDEXNOW_KEY`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

[MIT](LICENSE)

---

<p align="center">
  Built for the University of AL-Turath Research Community
</p>
