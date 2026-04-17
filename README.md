<p align="center">
  <h1 align="center">RIS — Researcher Information System</h1>
  <p align="center">
    <strong>نظام معلومات الباحثين — جامعة التراث</strong>
  </p>
  <p align="center">
    منصة دليل الباحثين ثنائية اللغة (عربي/إنكليزي) مع تتبّع المنشورات، تحليلات متقدّمة، وملفات باحثين مُحسَّنة لمحرّكات البحث.
    <br />
    A bilingual (EN/AR) research directory platform with publication tracking, analytics, and SEO-optimized researcher profiles.
  </p>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-self--hosted-3ecf8e?logo=supabase" />
  <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind-v4-06b6d4?logo=tailwindcss" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-green" />
</p>

<p align="center">
  <a href="#-features--المميزات">المميزات</a> · 
  <a href="#-quick-start">Quick Start</a> · 
  <a href="#-deployment">Deployment</a> · 
  <a href="docs/SETUP-REQUIREMENTS.md">Setup Guide</a> · 
  <a href="docs/ARCHITECTURE.md">Architecture</a>
</p>

---

## المميزات الرئيسية — Key Highlights

|     | الميزة                                           | Feature                                                |
| --- | ------------------------------------------------ | ------------------------------------------------------ |
| 🌍  | واجهة ثنائية اللغة مع دعم RTL كامل               | Bilingual UI (EN/AR) with full RTL support             |
| 🔍  | دليل باحثين مع بحث وتصفية متقدمة                 | Researcher directory with search + advanced filters    |
| 📄  | ملفات باحثين بـ 6 تبويبات + رمز QR + سيرة ذاتية  | 6-tab researcher profiles + QR code + CV download      |
| 📥  | استيراد من Google Scholar + ORCID + Scopus       | Import from Scholar (extension), ORCID (OAuth), Scopus |
| 📊  | لوحة تحليلات بـ 10+ رسم بياني تفاعلي             | Analytics dashboard with 10+ interactive charts        |
| 🛡️  | لوحة إدارة كاملة مع سجل تدقيق                    | Full admin panel with audit log                        |
| 🔎  | SEO متقدم: JSON-LD، OG images، sitemap، hreflang | Advanced SEO: JSON-LD, dynamic OG, sitemap, hreflang   |
| 🔒  | أمان على مستوى قاعدة البيانات (RLS)              | Database-level security (RLS on every table)           |
| 🤖  | بحث دلالي + شبكة تعاون بحثي                      | AI semantic search + co-authorship graph               |
| 💰  | مجاني بالكامل — بدون اشتراكات                    | 100% free — no paid subscriptions                      |

---

## Features — المميزات التفصيلية

### 🌐 Bilingual Interface — واجهة ثنائية اللغة

- Full English + Arabic with automatic RTL layout switching
- Cairo font for Arabic, Inter for English — auto-switch per locale
- ICU MessageFormat for Arabic plurals (all 6 forms)
- Language switcher preserves current page + URL params

### 👥 Researcher Directory — دليل الباحثين

- Debounced text search (300ms) across names in both languages
- Filters: College, Department (cascading), Workplace type, Academic title
- Sort: Name, Scopus h-index, WoS h-index, Publications, Citations, Recent
- Keyset pagination (O(log n) at any depth — no OFFSET degradation)
- Responsive card grid with skeleton loading states

### 👤 Researcher Profile — ملف الباحث

- **Overview** — Biography, research interests, social profiles, skills, languages, education, SDG alignment, contact info
- **Publications** — Filterable by year/source/type, DOI links, citation badges (Scopus/WoS/Scholar), "Load more" pagination
- **Projects** — Active/Completed sections with funding + role info
- **Experience** — Timeline of work history + certifications + awards
- **Thesis Advisory** — PhD/Master's supervision records
- **Activities** — Editorial boards, conferences, memberships
- QR code sharing (dialog with SVG QR)
- Print-friendly CV page (A4 layout, @media print optimized)
- Edit button visible only to the profile owner

### 📥 Publication Import — استيراد المنشورات

- **Google Scholar** — Chrome MV3 extension OR console script; uploads `.mrhenc` file
- **ORCID** — OAuth 2.0 with PKCE (S256) + CSRF state protection (FIX-27)
- **Scopus** — Server-side API call (key never reaches browser)
- **Smart dedup** — DOI exact match first, then normalized title+year match
- Returns `{inserted, updated, skipped}` counts

### 📊 Analytics Dashboard — لوحة التحليلات

- 4 KPI cards (researchers, publications, citations, avg h-index)
- Line chart: publications by year (15-year trend)
- Pie chart: publications by source (Scopus/WoS/OpenAlex)
- Bar chart: by publication type (journal/conference/book)
- Treemap: by college (area proportional to publication count)
- Bar chart: by academic title
- Histogram: h-index distribution (5 buckets)
- SDG alignment grid (17 UN goals with official colors)
- Filterable by year range + college
- Export: PNG (html-to-image), Excel (SheetJS), PDF (print)

### 🛡️ Admin Panel — لوحة الإدارة

- **Setup Guide** — Real-time service status (green/red) for all 7 integrations, with inline setup instructions in EN+AR
- **Manage Admins** — Add/remove by email, role-based (super_admin, college_admin, department_admin)
- **Visibility Manager** — Force show/hide researcher profiles (overrides user toggle)
- **Homepage Settings** — Toggle Scopus/WoS stats visibility
- **Audit Log** — Append-only log of all mutations (who changed what, when, before/after)
- **Colleges & Departments** — Full CRUD with slug management
- 403 page for non-admin users

### 🔎 SEO — تحسين محرّكات البحث

- `generateMetadata` on every page (title, description, OG, Twitter card)
- Dynamic OG images (1200x630 PNG per researcher, generated server-side)
- JSON-LD: Person, Organization (CollegeOrUniversity), ScholarlyArticle, BreadcrumbList
- `hreflang` alternates (en/ar/x-default) on every page
- Canonical URLs via `metadataBase`
- Dynamic sitemap with `generateSitemaps()` chunking (5000 URLs/file)
- `robots.txt` with proper disallow rules
- Legacy URL redirects (`/{username}/{lang}` → `/{lang}/researcher/{username}`)
- Google Search Console verification via env var
- IndexNow client for Bing/Yandex instant indexing
- 6 SEO hub pages: `/college`, `/department`, `/sdg`, `/topic`, `/publication`, `/year`

### 🔒 Security — الأمان

- Row Level Security (RLS) on all 24 tables
- `security_invoker = true` views (prevents the most common Supabase RLS bypass)
- Separate policies per operation (SELECT/INSERT/UPDATE/DELETE) with `WITH CHECK`
- `is_admin()` SECURITY DEFINER with `SET search_path` (CVE-2018-1058 family protection)
- PKCE OAuth for ORCID (S256 challenge + state CSRF + httpOnly cookies)
- Security headers (HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy)
- Zod validation on client (react-hook-form) + server (server actions) — double validation
- UUID allow-list on URL params
- Open redirect prevention on OAuth callbacks
- Supabase Storage RLS per bucket (owner-only write, path convention)
- `audit_log` is append-only (no UPDATE/DELETE policies)
- Service role key never reaches browser bundle

### 🤖 AI & Semantic Search — البحث الذكي

- pgvector extension with 768-dim embeddings (multilingual-e5-base per FIX-08)
- `semantic_search` RPC — cosine similarity against bio embeddings
- `find_similar_researchers` — top 5 similar by embedding distance
- Co-authorship graph — SVG force-directed visualization (zero-dependency)
- Python pipeline for batch embedding generation (sentence-transformers)

### 🔧 Developer Experience

- TypeScript strict mode (`noUncheckedIndexedAccess`, `noImplicitReturns`)
- ESLint + Prettier + Husky pre-commit hooks
- Vitest unit tests + Playwright E2E specs
- GitHub Actions CI (lint + typecheck + build) + Docker image build
- 3-stage Dockerfile (< 200 MB production image)
- Conventional commits enforced
- 30 idempotent SQL migrations

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
