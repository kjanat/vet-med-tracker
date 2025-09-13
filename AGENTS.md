# Repository Guidelines

## Project Structure & Module Organization

- App: `app/` (Next.js App Router, routes, layouts, error boundaries).
- UI & Logic: `components/`, `lib/`, `utils/` (TS/TSX, reusable modules), `server/` (API, tRPC).
- Data: `db/` (Drizzle schema, relations, migrations, seed data), `drizzle/` (generated migrations).
- Tests: `tests/` (unit, integration, e2e, helpers, factories), configs in `vitest.config*.ts` and `playwright.config.ts`.
- Misc: `public/`, `types/`, `docs/`, `scripts/` (db/test/perf utilities).

## Build, Test, and Development Commands

- Dev server: `pnpm dev` (or `pnpm dev:host`), production preview: `pnpm preview`.
- Build/start: `pnpm build`, `pnpm start`.
- Tests: `pnpm test` (all), `pnpm test:unit`, `pnpm test:integration`, `pnpm test:e2e`, coverage: `pnpm test:coverage`.
- Lint/format/typecheck: `pnpm lint`, `pnpm check` or `pnpm check:write`, `pnpm format`, `pnpm typecheck`.
- DB: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:studio`, test DB init/reset: `pnpm db:test:init|reset|seed`.

## Coding Style & Naming Conventions

- Language: TypeScript (strict). Indentation: 2 spaces. Imports use aliases `@/*`.
- Files: kebab-case for files (`dosage-calculator.tsx`); components export PascalCase; functions camelCase; constants UPPER_SNAKE.
- Tools: Biome + ESLint (`pnpm lint`, `pnpm format`, `pnpm check:write`). Avoid unused exports and implicit `any`.

## Testing Guidelines

- Frameworks: Vitest + Testing Library (unit/integration), Playwright (e2e), Percy (visual).
- Location/naming: place tests under `tests/{unit,integration,e2e}` with `*.test.ts(x)`.
- Database: local PostgreSQL for tests (see `tests/README.md`); run `pnpm db:test:init` before tests.
  Use factories/helpers in `tests/helpers/` and reset state between tests.

## Commit & Pull Request Guidelines

- Commits follow Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, optional scope.
- PRs: include clear description, linked issues, screenshots/GIFs for UI changes, DB migration
  notes, and test coverage notes. Ensure CI green: build, lint, typecheck, tests.

## Security & Configuration Tips

- Never commit secrets. Use `.env.local` for runtime; test vars via `.env.test`. Node >= 22, pnpm >= 10.
- When touching schema, run `pnpm db:generate` then `pnpm db:migrate`. Validate with `pnpm db:studio`.

## Agent-Specific Instructions

- Prefer minimal, scoped changes; follow this file’s conventions. Keep filenames and exports consistent,
  run `pnpm check:write` and tests before PRs, and avoid adding new tooling without discussion.
