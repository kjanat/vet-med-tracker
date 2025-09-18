# VetMed Tracker Migration & Seeding Workflow

This document captures the code-first migration flow we now use with Drizzle and highlights how to run the associated scripts.

## Directory Layout

- `db/schema/` – canonical Drizzle schema, grouped by concern (`tables.ts`, `relations.ts`, `index.ts`).
- `db/migrations/generated/` – auto-generated SQL + snapshots from `drizzle-kit generate`.
- `db/migrations/manual/` – TypeScript-powered migrations for advanced SQL (materialized views, pg_cron jobs, etc.).
- `db/ops/` – reusable database utilities (manual migrator, materialized-view deploy/refresh helpers, seeding logic).
- `scripts/` – Bun entrypoints for running migrations and seeds (`migrate.ts`, `seed.ts`).

## Day-To-Day Flow

1. Update schema definitions inside `db/schema/` (add tables, columns, relations, enums, views).
2. Generate SQL: `bunx drizzle-kit generate` (writes to `db/migrations/generated/`).
3. Apply migrations locally: `bun scripts/migrate.ts` (runs generated SQL + any manual migrations).
4. Verify app/tests. Commit schema, migrations, and any manual migration modules.
5. Deploy: CI or release jobs call `bun scripts/migrate.ts` against the target database before starting the app.

## Manual Materialized-View Migration

- Defined in `db/migrations/manual/20250918_materialized_views.ts`.
- Uses helpers from `db/ops/materialized-views.ts` to execute the SQL files in `db/materialized-views/`.
- Tracked in the `vetmed_manual_migrations` table to ensure idempotent execution.

## Scripts

### Run All Migrations

```bash
bun scripts/migrate.ts
```

Options:

- `--directory <path>` – override generated migrations folder (defaults to `db/migrations/generated`).
- `--skip-manual` – apply only generated migrations.

### Seed Medication Catalog

```bash
bun scripts/seed.ts      # verbose output
bun scripts/seed.ts --silent
```

Seeding uses the shared Drizzle connection and typed helpers from `db/ops/seed-medications.ts`.

## CI Recommendations

- Run `bunx drizzle-kit check` to detect migration conflicts.
- Execute `bun scripts/migrate.ts --skip-manual` for smoke tests; deploy environments should run the full script.
- Optional: add a nightly job invoking `triggerMaterializedViewRefresh()` (from `lib/infrastructure/materialized-views.ts`) to keep analytics fresh.
