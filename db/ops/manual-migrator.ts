import { sql } from "drizzle-orm";
import * as materializedViews from "../migrations/manual/20250918_materialized_views";
import type { DatabaseExecutor } from "./utils";
import { formatManualMigrationId } from "./utils";

type ManualMigrationModule = {
  id: string;
  up: (db: DatabaseExecutor) => Promise<void>;
  down?: (db: DatabaseExecutor) => Promise<void>;
};

const MANUAL_MIGRATIONS: ManualMigrationModule[] = [materializedViews];

const TRACKING_TABLE = "vetmed_manual_migrations";

async function ensureTrackingTable(db: DatabaseExecutor): Promise<void> {
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `),
  );
}

function isQueryResult(value: unknown): value is { rows?: unknown[] } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    "rows" in (value as Record<string, unknown>)
  );
}

export async function applyManualMigrations(
  db: DatabaseExecutor,
): Promise<void> {
  await ensureTrackingTable(db);

  for (const migration of MANUAL_MIGRATIONS) {
    const normalizedId = formatManualMigrationId(migration.id);
    const existing = await db.execute(
      sql.raw(
        `SELECT id FROM ${TRACKING_TABLE} WHERE id = '${normalizedId}' LIMIT 1`,
      ),
    );

    if (isQueryResult(existing) && existing.rows && existing.rows.length > 0) {
      continue;
    }

    await migration.up(db);
    await db.execute(
      sql.raw(`INSERT INTO ${TRACKING_TABLE} (id) VALUES ('${normalizedId}')`),
    );
  }
}
