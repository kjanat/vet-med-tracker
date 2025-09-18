import { dbUnpooled, timedOperations } from "@/db/drizzle";
import {
  deployMaterializedViews,
  refreshAllMaterializedViews,
} from "@/db/ops/materialized-views";
import type { DatabaseExecutor } from "@/db/ops/utils";

function selectDatabase(
  db?: DatabaseExecutor | typeof dbUnpooled,
): DatabaseExecutor {
  return (db ?? dbUnpooled) as unknown as DatabaseExecutor;
}

export async function ensureMaterializedViews(input?: {
  db?: DatabaseExecutor;
  operationName?: string;
}): Promise<void> {
  const database = selectDatabase(input?.db);
  await timedOperations.write(
    () => deployMaterializedViews(database),
    input?.operationName ?? "materialized-views-deploy",
  );
}

export async function triggerMaterializedViewRefresh(input?: {
  db?: DatabaseExecutor;
  operationName?: string;
}): Promise<void> {
  const database = selectDatabase(input?.db);
  await timedOperations.analytics(
    () => refreshAllMaterializedViews(database),
    input?.operationName ?? "materialized-views-refresh",
  );
}
