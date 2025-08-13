import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { timedOperations } from "@/db/drizzle";
import { createTRPCRouter, ownerProcedure } from "@/server/api/trpc";

// Types for materialized view administration
interface MVRefreshStatus {
  viewName: string;
  lastRefresh: Date | null;
  avgDurationMs: number;
  successRate: number;
  lastError: string | null;
  rowsCount: number;
  healthStatus: "HEALTHY" | "STALE" | "FAILING" | "SLOW" | "UNKNOWN";
}

interface MVRefreshLog {
  id: number;
  viewName: string;
  refreshStartedAt: Date;
  refreshCompletedAt: Date | null;
  refreshDurationMs: number | null;
  rowsAffected: number | null;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  errorMessage: string | null;
  refreshType: "CONCURRENT" | "FULL";
}

interface MVPerformanceMetrics {
  viewName: string;
  totalRefreshes: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  lastWeekSuccess: number;
  trendDirection: "UP" | "DOWN" | "STABLE";
}

const refreshViewSchema = z.object({
  householdId: z.uuid(),
  viewName: z.enum([
    "mv_compliance_stats",
    "mv_medication_usage",
    "mv_inventory_consumption",
    "mv_animal_health_trends",
    "all",
  ]),
  refreshType: z.enum(["CONCURRENT", "FULL"]).default("CONCURRENT"),
});

const getRefreshLogsSchema = z.object({
  householdId: z.uuid(),
  viewName: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  since: z.iso.datetime().optional(),
});

const getPerformanceMetricsSchema = z.object({
  householdId: z.uuid(),
  days: z.number().min(1).max(30).default(7),
});

export const adminMaterializedViewsRouter = createTRPCRouter({
  // Get current status of all materialized views
  getRefreshStatus: ownerProcedure
    .input(z.object({ householdId: z.uuid() }))
    .query(async ({ ctx }) => {
      const statusQuery = await timedOperations.analytics(
        () => ctx.db.execute(sql`SELECT * FROM get_mv_refresh_status()`),
        "mv-refresh-status-query",
      );

      return statusQuery.rows.map(
        (row): MVRefreshStatus => ({
          viewName: String(row.view_name),
          lastRefresh: row.last_refresh
            ? new Date(String(row.last_refresh))
            : null,
          avgDurationMs: Number(row.avg_duration_ms) || 0,
          successRate: Number(row.success_rate) || 0,
          lastError: row.last_error ? String(row.last_error) : null,
          rowsCount: Number(row.rows_count) || 0,
          healthStatus: determineHealthStatus(
            row.last_refresh ? new Date(String(row.last_refresh)) : null,
            Number(row.success_rate) || 0,
            Number(row.avg_duration_ms) || 0,
          ),
        }),
      );
    }),

  // Manually trigger materialized view refresh
  refreshView: ownerProcedure
    .input(refreshViewSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        let refreshFunction: string;

        switch (input.viewName) {
          case "mv_compliance_stats":
            refreshFunction = "refresh_compliance_stats()";
            break;
          case "mv_medication_usage":
            refreshFunction = "refresh_medication_usage()";
            break;
          case "mv_inventory_consumption":
            refreshFunction = "refresh_inventory_consumption()";
            break;
          case "mv_animal_health_trends":
            refreshFunction = "refresh_animal_health_trends()";
            break;
          case "all":
            refreshFunction = "refresh_all_materialized_views()";
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid view name",
            });
        }

        const refreshResult = await timedOperations.analytics(
          () => ctx.db.execute(sql`SELECT * FROM ${sql.raw(refreshFunction)}`),
          `manual-refresh-${input.viewName}`,
        );

        const results = refreshResult.rows.map((row) => ({
          viewName: String(row.view_name),
          refreshDurationMs: Number(row.refresh_duration_ms),
          rowsCount: Number(row.rows_count),
          status: String(row.status),
        }));

        return {
          success: true,
          results,
          message: `Successfully refreshed ${input.viewName}`,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to refresh ${input.viewName}: ${errorMessage}`,
        });
      }
    }),

  // Get refresh logs with filtering
  getRefreshLogs: ownerProcedure
    .input(getRefreshLogsSchema)
    .query(async ({ ctx, input }) => {
      let whereClause = "";
      const params: any[] = [];

      if (input.viewName) {
        whereClause += `WHERE view_name = $1`;
        params.push(input.viewName);
      }

      if (input.since) {
        const sinceClause = input.viewName
          ? `AND refresh_started_at >= $2`
          : `WHERE refresh_started_at >= $1`;
        whereClause += ` ${sinceClause}`;
        params.push(input.since);
      }

      const logsQuery = sql`
				SELECT 
					id,
					view_name,
					refresh_started_at,
					refresh_completed_at,
					refresh_duration_ms,
					rows_affected,
					status,
					error_message,
					refresh_type
				FROM mv_refresh_log 
				${sql.raw(whereClause)}
				ORDER BY refresh_started_at DESC
				LIMIT ${input.limit}
			`;

      const logsResult = await timedOperations.analytics(
        () => ctx.db.execute(logsQuery),
        "mv-refresh-logs-query",
      );

      return logsResult.rows.map(
        (row): MVRefreshLog => ({
          id: Number(row.id),
          viewName: String(row.view_name),
          refreshStartedAt: new Date(String(row.refresh_started_at)),
          refreshCompletedAt: row.refresh_completed_at
            ? new Date(String(row.refresh_completed_at))
            : null,
          refreshDurationMs: row.refresh_duration_ms
            ? Number(row.refresh_duration_ms)
            : null,
          rowsAffected: row.rows_affected ? Number(row.rows_affected) : null,
          status: String(row.status) as "RUNNING" | "COMPLETED" | "FAILED",
          errorMessage: row.error_message ? String(row.error_message) : null,
          refreshType: String(row.refresh_type) as "CONCURRENT" | "FULL",
        }),
      );
    }),

  // Get performance metrics and trends
  getPerformanceMetrics: ownerProcedure
    .input(getPerformanceMetricsSchema)
    .query(async ({ ctx, input }) => {
      const metricsQuery = sql`
				WITH recent_refreshes AS (
					SELECT 
						view_name,
						refresh_duration_ms,
						status,
						refresh_started_at
					FROM mv_refresh_log
					WHERE refresh_started_at >= NOW() - INTERVAL '${sql.raw(input.days.toString())} days'
						AND refresh_completed_at IS NOT NULL
				),
				metrics AS (
					SELECT 
						view_name,
						COUNT(*) as total_refreshes,
						COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful_refreshes,
						COUNT(*) FILTER (WHERE status = 'FAILED') as failed_refreshes,
						AVG(refresh_duration_ms) as avg_duration_ms,
						MIN(refresh_duration_ms) as min_duration_ms,
						MAX(refresh_duration_ms) as max_duration_ms
					FROM recent_refreshes
					GROUP BY view_name
				),
				last_week AS (
					SELECT 
						view_name,
						COUNT(*) FILTER (WHERE status = 'COMPLETED') as last_week_success
					FROM mv_refresh_log
					WHERE refresh_started_at >= NOW() - INTERVAL '7 days'
						AND refresh_started_at < NOW() - INTERVAL '7 days' + INTERVAL '7 days'
						AND refresh_completed_at IS NOT NULL
					GROUP BY view_name
				),
				this_week AS (
					SELECT 
						view_name,
						COUNT(*) FILTER (WHERE status = 'COMPLETED') as this_week_success
					FROM mv_refresh_log
					WHERE refresh_started_at >= NOW() - INTERVAL '7 days'
						AND refresh_completed_at IS NOT NULL
					GROUP BY view_name
				)
				SELECT 
					m.*,
					COALESCE(lw.last_week_success, 0) as last_week_success,
					COALESCE(tw.this_week_success, 0) as this_week_success,
					CASE 
						WHEN COALESCE(tw.this_week_success, 0) > COALESCE(lw.last_week_success, 0) THEN 'UP'
						WHEN COALESCE(tw.this_week_success, 0) < COALESCE(lw.last_week_success, 0) THEN 'DOWN'
						ELSE 'STABLE'
					END as trend_direction
				FROM metrics m
				LEFT JOIN last_week lw ON m.view_name = lw.view_name
				LEFT JOIN this_week tw ON m.view_name = tw.view_name
				ORDER BY m.view_name
			`;

      const metricsResult = await timedOperations.analytics(
        () => ctx.db.execute(metricsQuery),
        "mv-performance-metrics-query",
      );

      return metricsResult.rows.map(
        (row): MVPerformanceMetrics => ({
          viewName: String(row.view_name),
          totalRefreshes: Number(row.total_refreshes),
          successfulRefreshes: Number(row.successful_refreshes),
          failedRefreshes: Number(row.failed_refreshes),
          avgDurationMs: Math.round(Number(row.avg_duration_ms) || 0),
          minDurationMs: Number(row.min_duration_ms) || 0,
          maxDurationMs: Number(row.max_duration_ms) || 0,
          lastWeekSuccess: Number(row.last_week_success) || 0,
          trendDirection: String(row.trend_direction) as
            | "UP"
            | "DOWN"
            | "STABLE",
        }),
      );
    }),

  // Get materialized view sizes and row counts
  getViewSizes: ownerProcedure
    .input(z.object({ householdId: z.uuid() }))
    .query(async ({ ctx }) => {
      const sizesQuery = sql`
				WITH view_sizes AS (
					SELECT 'mv_compliance_stats' as view_name, COUNT(*) as row_count FROM mv_compliance_stats
					UNION ALL
					SELECT 'mv_medication_usage' as view_name, COUNT(*) as row_count FROM mv_medication_usage
					UNION ALL
					SELECT 'mv_inventory_consumption' as view_name, COUNT(*) as row_count FROM mv_inventory_consumption
					UNION ALL
					SELECT 'mv_animal_health_trends' as view_name, COUNT(*) as row_count FROM mv_animal_health_trends
				),
				table_sizes AS (
					SELECT 
						schemaname,
						tablename as view_name,
						pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
						pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
					FROM pg_tables 
					WHERE tablename LIKE 'mv_%'
					UNION ALL
					SELECT 
						schemaname,
						matviewname as view_name,
						pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
						pg_total_relation_size(schemaname||'.'||matviewname) as size_bytes
					FROM pg_matviews 
					WHERE matviewname LIKE 'mv_%'
				)
				SELECT 
					vs.view_name,
					vs.row_count,
					ts.size,
					ts.size_bytes
				FROM view_sizes vs
				LEFT JOIN table_sizes ts ON vs.view_name = ts.view_name
				ORDER BY vs.view_name
			`;

      const sizesResult = await timedOperations.analytics(
        () => ctx.db.execute(sizesQuery),
        "mv-sizes-query",
      );

      return sizesResult.rows.map((row) => ({
        viewName: String(row.view_name),
        rowCount: Number(row.row_count),
        size: String(row.size || "Unknown"),
        sizeBytes: Number(row.size_bytes) || 0,
      }));
    }),

  // Cleanup old refresh logs
  cleanupLogs: ownerProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        olderThanDays: z.number().min(1).max(90).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deletedCount = await timedOperations.analytics(
        () =>
          ctx.db.execute(sql`
					SELECT cleanup_mv_refresh_logs() as deleted_count
				`),
        "mv-cleanup-logs",
      );

      const count = Number(deletedCount.rows[0]?.deleted_count) || 0;

      return {
        success: true,
        deletedCount: count,
        message: `Cleaned up ${count} old refresh log entries`,
      };
    }),

  // Get health dashboard summary
  getHealthDashboard: ownerProcedure
    .input(z.object({ householdId: z.uuid() }))
    .query(async ({ ctx }) => {
      const healthQuery = sql`
				WITH refresh_health AS (
					SELECT * FROM mv_refresh_health
				),
				system_health AS (
					SELECT 
						COUNT(*) as total_views,
						COUNT(*) FILTER (WHERE health_status = 'HEALTHY') as healthy_views,
						COUNT(*) FILTER (WHERE health_status = 'STALE') as stale_views,
						COUNT(*) FILTER (WHERE health_status = 'FAILING') as failing_views,
						COUNT(*) FILTER (WHERE health_status = 'SLOW') as slow_views,
						AVG(success_rate_pct) as avg_success_rate,
						SUM(row_count) as total_rows
					FROM refresh_health
				),
				recent_errors AS (
					SELECT 
						view_name,
						error_message,
						refresh_started_at
					FROM mv_refresh_log
					WHERE status = 'FAILED'
						AND refresh_started_at >= NOW() - INTERVAL '24 hours'
					ORDER BY refresh_started_at DESC
					LIMIT 5
				)
				SELECT 
					sh.total_views,
					sh.healthy_views,
					sh.stale_views,
					sh.failing_views,
					sh.slow_views,
					sh.avg_success_rate,
					sh.total_rows,
					COALESCE(
						JSON_AGG(
							JSON_BUILD_OBJECT(
								'viewName', re.view_name,
								'error', re.error_message,
								'timestamp', re.refresh_started_at
							)
						) FILTER (WHERE re.view_name IS NOT NULL),
						'[]'::json
					) as recent_errors
				FROM system_health sh
				LEFT JOIN recent_errors re ON true
				GROUP BY sh.total_views, sh.healthy_views, sh.stale_views, sh.failing_views, sh.slow_views, sh.avg_success_rate, sh.total_rows
			`;

      const healthResult = await timedOperations.analytics(
        () => ctx.db.execute(healthQuery),
        "mv-health-dashboard-query",
      );

      const row = healthResult.rows[0];
      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No materialized view data found",
        });
      }

      return {
        totalViews: Number(row.total_views),
        healthyViews: Number(row.healthy_views),
        staleViews: Number(row.stale_views),
        failingViews: Number(row.failing_views),
        slowViews: Number(row.slow_views),
        avgSuccessRate: Math.round(Number(row.avg_success_rate) || 0),
        totalRows: Number(row.total_rows),
        recentErrors: Array.isArray(row.recent_errors) ? row.recent_errors : [],
        overallHealth: determineOverallHealth(
          Number(row.healthy_views),
          Number(row.total_views),
          Number(row.avg_success_rate) || 0,
        ),
      };
    }),
});

// Helper functions
function determineHealthStatus(
  lastRefresh: Date | null,
  successRate: number,
  avgDurationMs: number,
): MVRefreshStatus["healthStatus"] {
  if (!lastRefresh || lastRefresh < new Date(Date.now() - 2 * 60 * 60 * 1000)) {
    return "STALE";
  }

  if (successRate < 80) {
    return "FAILING";
  }

  if (avgDurationMs > 30000) {
    // > 30 seconds
    return "SLOW";
  }

  if (successRate >= 95 && avgDurationMs < 10000) {
    return "HEALTHY";
  }

  return "UNKNOWN";
}

function determineOverallHealth(
  healthyViews: number,
  totalViews: number,
  avgSuccessRate: number,
): "EXCELLENT" | "GOOD" | "FAIR" | "POOR" {
  const healthyRatio = totalViews > 0 ? healthyViews / totalViews : 0;

  if (healthyRatio >= 0.9 && avgSuccessRate >= 95) {
    return "EXCELLENT";
  }

  if (healthyRatio >= 0.75 && avgSuccessRate >= 85) {
    return "GOOD";
  }

  if (healthyRatio >= 0.5 && avgSuccessRate >= 70) {
    return "FAIR";
  }

  return "POOR";
}
