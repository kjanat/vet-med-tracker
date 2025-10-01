import { sql } from "drizzle-orm";
import { deployMaterializedViews } from "../../ops/materialized-views.ts";
import type { DatabaseExecutor } from "../../ops/utils.ts";

export const id = "20250918_materialized_views";

export async function up(db: DatabaseExecutor): Promise<void> {
  await deployMaterializedViews(db);
}

export async function down(db: DatabaseExecutor): Promise<void> {
  await db.execute(
    sql.raw(`
    DROP MATERIALIZED VIEW IF EXISTS mv_animal_health_trends;
    DROP MATERIALIZED VIEW IF EXISTS mv_inventory_consumption;
    DROP MATERIALIZED VIEW IF EXISTS mv_medication_usage;
    DROP MATERIALIZED VIEW IF EXISTS mv_compliance_stats;
    DROP FUNCTION IF EXISTS refresh_animal_health_trends();
    DROP FUNCTION IF EXISTS refresh_inventory_consumption();
    DROP FUNCTION IF EXISTS refresh_medication_usage();
    DROP FUNCTION IF EXISTS refresh_compliance_stats();
    DROP FUNCTION IF EXISTS refresh_all_materialized_views();
    DROP FUNCTION IF EXISTS get_mv_refresh_status();
    DROP FUNCTION IF EXISTS cleanup_mv_refresh_logs();
    DROP TABLE IF EXISTS mv_refresh_log;
  `),
  );
}
