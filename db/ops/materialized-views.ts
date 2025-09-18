import { sql } from "drizzle-orm";
import type { DatabaseExecutor } from "./utils";
import { runSqlFile } from "./utils";

const MATERIALIZED_VIEWS_ROOT = "db/materialized-views";

const DEPLOY_FILES = [
  "refresh_functions.sql",
  "001_compliance_statistics.sql",
  "002_medication_usage.sql",
  "003_inventory_consumption.sql",
  "004_animal_health_trends.sql",
  "automated_refresh.sql",
] as const;

export async function deployMaterializedViews(
  db: DatabaseExecutor,
): Promise<void> {
  for (const file of DEPLOY_FILES) {
    const relativePath = `${MATERIALIZED_VIEWS_ROOT}/${file}`;
    await runSqlFile(db, relativePath);
  }
}

export async function refreshAllMaterializedViews(
  db: DatabaseExecutor,
): Promise<void> {
  await db.execute(sql`SELECT refresh_all_materialized_views();`);
}
