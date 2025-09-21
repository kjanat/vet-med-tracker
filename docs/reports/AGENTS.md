# Repository Guidelines

## Project Structure & Module Organization

Next.js App Router features live in `app/`, with authenticated routes under `app/(authed)` and REST handlers in
`app/api`. Shared UI primitives sit in `components/`, reusable hooks in `hooks/`, and domain utilities in `lib/` (
notably `lib/infrastructure` and `lib/schemas`). Server-only logic, including tRPC routers and schedulers, resides in
`server/`. Database schema, migrations, and Drizzle config live in `db/`. Tests are grouped under `tests/`, and static
assets ship from `public/`.

## Build, Test, and Development Commands

Use `bun dev` for the Turbopack-enabled dev server and `bun preview` when validating a production build locally. Bundles
come from `bun build`. Stay in sync with `bun db:generate`/`bun db:push`; inspect data via `bun db:studio`. Quality
gates rely on `bun typecheck`, `bun lint`, and `bun format`. Run unit suites with `bun test`; execute end-to-end
coverage using `bun test:e2e`. Combine checks before pushing with `bun test:all`.

## Coding Style & Naming Conventions

Biome enforces formatting—run `bun format` before committing. The codebase uses TypeScript strict mode, two-space
indentation, and eschews default exports. Components stay in PascalCase (e.g., `MedicationCard.tsx`), hooks in
`useCamelCase.ts`, and utility modules in kebab or camel case under `lib/`. Tailwind CSS is configured via v4 presets;
prefer design tokens and avoid ad-hoc color hexes. Keep environment-sensitive code behind server/client boundaries using
`"use client"` directives sparingly.

## Testing Guidelines

Bun's built-in runner (`docs/testing/`) owns unit and integration suites; keep helper mocks in `tests/__support__`. Use
`bun test --watch` for quick loops and `bun test --update-snapshots` when snapshots drift. Set `AGENT=1` when you need
AI-friendly test output. UI flows currently lack automated coverage; coordinate with the team before reintroducing any browser-driven E2E harness.
Maintain the coverage baseline in `coverage/`; investigate dips before merging.

- Documentation database is available in ./docs/llms/testing/*.md

## Commit & Pull Request Guidelines

Follow Conventional Commits (`fix:`, `refactor:`, `chore:`) as seen in recent history. Keep messages imperative and
scope-specific (`feat(server): add refill reminders`). Each PR should include: a concise summary, linked Linear/GitHub
issue, test plan (commands run), and screenshots or recordings for UI-facing changes. Verify lint, typecheck, and both
test suites locally before requesting review. Tag reviewers familiar with the touched areas and wait for at least one
approval before merging.

## Database & Environment Notes

Create local env files from `.env.example` and store secrets only in `.env.local`. Drizzle migrations run against the
URLs exposed in `drizzle.config.ts`; never hardcode credentials in scripts. For staging operations, prefer
`bun db:migrate:staging` with exported `STAGING_DATABASE_URL` values and confirm destructive changes with the infra
channel.

- Documentation database is available in ./docs/llms/neon/*.md
