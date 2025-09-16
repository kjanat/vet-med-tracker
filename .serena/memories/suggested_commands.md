# Suggested Commands

- Install deps: `bun install`
- Dev server: `bun dev` (or `bun dev:host` to expose on LAN, `bun dev:turbo` for Turbopack).
- Type checking: `bun typecheck`
- Linting/fixes: `bun lint` for checks, `bun lint:fix` to apply Biome fixes, `bun format` for formatting.
- Tests: `bun test` (Vitest), `bun test:e2e` (Playwright), `bun test:all` to run both, `bun test:coverage` for coverage.
- Database: `bun db:generate`, `bun db:push`, `bun db:seed`, plus `bun db:test:*` helpers for the test database.
- Build/deploy: `bun build`, `bun preview`, `bun build:analyze`, `bun deploy:staging|production`.
