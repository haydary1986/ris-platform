# Contributing to RIS Platform

Thank you for your interest in contributing to the Researcher Information System.

## Development Setup

```bash
git clone https://github.com/haydary1986/ris-platform.git
cd ris-platform
npm install
cp .env.example .env.local
npm run dev
```

## Branch Strategy

| Branch      | Purpose                         |
| ----------- | ------------------------------- |
| `main`      | Production-ready code           |
| `develop`   | Integration branch for features |
| `feature/*` | Individual features             |
| `fix/*`     | Bug fixes                       |

## Workflow

1. Create a branch from `develop`: `git checkout -b feature/my-feature develop`
2. Make your changes
3. Run checks: `npm run lint && npm run typecheck && npm test`
4. Commit using conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
5. Push and open a PR against `develop`
6. Wait for CI to pass + code review

## Code Standards

- **TypeScript strict mode** — no `any`, use `unknown` for external data
- **Immutability** — spread/copy, never mutate
- **Files < 800 lines**, functions < 50 lines
- **No console.log** in production code
- **Zod validation** on all user input (client + server)
- **RLS-first** — every DB write goes through Supabase client with user session

## Commit Messages

```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

## Testing

- **Unit tests:** `npm test` (Vitest)
- **E2E tests:** `npm run test:e2e` (Playwright)
- **Coverage target:** 80%+

## Translations

- Add keys to both `messages/en.json` and `messages/ar.json`
- Use ICU MessageFormat for plurals
- Arabic: use all 6 plural forms (zero/one/two/few/many/other)

## Database Changes

- Add a new migration file in `supabase/migrations/` with timestamp prefix
- Migrations must be idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Always include `DROP ... IF EXISTS` before `CREATE` for functions/triggers
- Enable RLS on new tables
- Add policies following existing patterns (owner + admin split)
