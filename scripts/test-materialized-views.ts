#!/usr/bin/env tsx

/**
 * Test script to validate materialized view performance and correctness
 * Run with: tsx scripts/test-materialized-views.ts
 */

import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { db } from "@/db/drizzle";

interface TestResult {
  testName: string;
  originalQueryTime: number;
  materializedViewTime: number;
  improvementPct: number;
  rowCountMatch: boolean;
  status: "PASS" | "FAIL";
  details?: string;
}

async function measureQuery(
  name: string,
  queryFn: () => Promise<any>,
): Promise<{ time: number; result: any }> {
  console.log(`  Running ${name}...`);
  const start = performance.now();
  const result = await queryFn();
  const end = performance.now();
  const time = Math.round(end - start);
  console.log(`  ${name}: ${time}ms`);
  return { time, result };
}

async function testComplianceStats(): Promise<TestResult> {
  console.log("\n=== Testing Compliance Statistics ===");

  // Original query (from insights.ts)
  const originalQuery = async () => {
    return db.execute(sql`
            SELECT household_id,
                   animal_id,
                   DATE_TRUNC('day', recorded_at) as day,
				COUNT(*) as total,
				COUNT(CASE WHEN status = 'ON_TIME' THEN 1 END) as on_time,
				COUNT(CASE WHEN status IN ('LATE', 'VERY_LATE') THEN 1 END) as late,
				COUNT(CASE WHEN status = 'MISSED' THEN 1 END) as missed
            FROM vetmed_administrations
            WHERE recorded_at >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY household_id, animal_id, DATE_TRUNC('day', recorded_at)
                LIMIT 100
        `);
  };

  // Materialized view query
  const materializedQuery = async () => {
    return db.execute(sql`
            SELECT household_id,
                   animal_id, day, SUM (total_doses) as total, SUM (on_time_count) as on_time, SUM (late_count + very_late_count) as late, SUM (missed_count) as missed
            FROM mv_compliance_stats
            WHERE day >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY household_id, animal_id, day
                LIMIT 100
        `);
  };

  const original = await measureQuery("Original Query", originalQuery);
  const materialized = await measureQuery(
    "Materialized View",
    materializedQuery,
  );

  const improvementPct = Math.round(
    ((original.time - materialized.time) / original.time) * 100,
  );
  const rowCountMatch =
    original.result.rows.length === materialized.result.rows.length;

  return {
    testName: "Compliance Statistics",
    originalQueryTime: original.time,
    materializedViewTime: materialized.time,
    improvementPct,
    rowCountMatch,
    status: improvementPct > 50 && rowCountMatch ? "PASS" : "FAIL",
    details: `Rows: ${original.result.rows.length} vs ${materialized.result.rows.length}`,
  };
}

async function testMedicationUsage(): Promise<TestResult> {
  console.log("\n=== Testing Medication Usage ===");

  // Original complex medication usage query
  const originalQuery = async () => {
    return db.execute(sql`
            SELECT household_id,
                   medication_id,
                   DATE_TRUNC('month', recorded_at) as month,
				COUNT(*) as total_administrations,
				COUNT(DISTINCT animal_id) as animals_treated,
				COUNT(CASE WHEN adverse_event = true THEN 1 END) as adverse_events
            FROM vetmed_administrations a
                JOIN vetmed_regimens r
            ON a.regimen_id = r.id
            WHERE recorded_at >= CURRENT_DATE - INTERVAL '180 days'
            GROUP BY household_id, medication_id, DATE_TRUNC('month', recorded_at)
                LIMIT 100
        `);
  };

  // Materialized view query
  const materializedQuery = async () => {
    return db.execute(sql`
            SELECT household_id,
                   medication_id, month, SUM (total_administrations) as total_administrations, AVG (animals_treated) as animals_treated, SUM (adverse_events) as adverse_events
            FROM mv_medication_usage
            WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '180 days')
            GROUP BY household_id, medication_id, month
                LIMIT 100
        `);
  };

  const original = await measureQuery("Original Query", originalQuery);
  const materialized = await measureQuery(
    "Materialized View",
    materializedQuery,
  );

  const improvementPct = Math.round(
    ((original.time - materialized.time) / original.time) * 100,
  );
  const rowCountSimilar =
    Math.abs(original.result.rows.length - materialized.result.rows.length) <=
    5;

  return {
    testName: "Medication Usage",
    originalQueryTime: original.time,
    materializedViewTime: materialized.time,
    improvementPct,
    rowCountMatch: rowCountSimilar,
    status: improvementPct > 50 && rowCountSimilar ? "PASS" : "FAIL",
    details: `Rows: ${original.result.rows.length} vs ${materialized.result.rows.length}`,
  };
}

async function testInventoryConsumption(): Promise<TestResult> {
  console.log("\n=== Testing Inventory Consumption ===");

  // Simplified inventory query for testing
  const originalQuery = async () => {
    return db.execute(sql`
            SELECT household_id,
                   medication_id,
                   COUNT(*)             as consumption_events,
                   AVG(units_remaining) as avg_remaining
            FROM vetmed_inventory_items
            WHERE created_at >= CURRENT_DATE - INTERVAL '365 days'
              AND deleted_at IS NULL
            GROUP BY household_id, medication_id
                LIMIT 50
        `);
  };

  // Materialized view query
  const materializedQuery = async () => {
    return db.execute(sql`
            SELECT household_id,
                   medication_id,
                   COUNT(*)                   as consumption_events,
                   AVG(total_units_remaining) as avg_remaining
            FROM mv_inventory_consumption
            WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '365 days')
            GROUP BY household_id, medication_id
                LIMIT 50
        `);
  };

  const original = await measureQuery("Original Query", originalQuery);
  const materialized = await measureQuery(
    "Materialized View",
    materializedQuery,
  );

  const improvementPct = Math.round(
    ((original.time - materialized.time) / original.time) * 100,
  );
  const rowCountSimilar =
    Math.abs(original.result.rows.length - materialized.result.rows.length) <=
    10;

  return {
    testName: "Inventory Consumption",
    originalQueryTime: original.time,
    materializedViewTime: materialized.time,
    improvementPct,
    rowCountMatch: rowCountSimilar,
    status: improvementPct > 30 && rowCountSimilar ? "PASS" : "FAIL",
    details: `Rows: ${original.result.rows.length} vs ${materialized.result.rows.length}`,
  };
}

async function testAnimalHealthTrends(): Promise<TestResult> {
  console.log("\n=== Testing Animal Health Trends ===");

  // Original animal health query
  const originalQuery = async () => {
    return db.execute(sql`
            SELECT a.household_id,
                   a.animal_id,
                   DATE_TRUNC('month', a.recorded_at) as month,
				COUNT(DISTINCT r.medication_id) as unique_medications,
				COUNT(*) as total_administrations,
				AVG(CASE WHEN a.status = 'ON_TIME' THEN 1.0 ELSE 0.0 END) * 100 as on_time_rate
            FROM vetmed_administrations a
                JOIN vetmed_regimens r
            ON a.regimen_id = r.id
            WHERE a.recorded_at >= CURRENT_DATE - INTERVAL '12 months'
            GROUP BY a.household_id, a.animal_id, DATE_TRUNC('month', a.recorded_at)
                LIMIT 100
        `);
  };

  // Materialized view query
  const materializedQuery = async () => {
    return db.execute(sql`
            SELECT household_id,
                   animal_id, month, unique_medications, total_administrations, on_time_rate
            FROM mv_animal_health_trends
            WHERE month >= DATE_TRUNC('month'
                , CURRENT_DATE - INTERVAL '12 months')
                LIMIT 100
        `);
  };

  const original = await measureQuery("Original Query", originalQuery);
  const materialized = await measureQuery(
    "Materialized View",
    materializedQuery,
  );

  const improvementPct = Math.round(
    ((original.time - materialized.time) / original.time) * 100,
  );
  const rowCountMatch =
    Math.abs(original.result.rows.length - materialized.result.rows.length) <=
    5;

  return {
    testName: "Animal Health Trends",
    originalQueryTime: original.time,
    materializedViewTime: materialized.time,
    improvementPct,
    rowCountMatch,
    status: improvementPct > 50 && rowCountMatch ? "PASS" : "FAIL",
    details: `Rows: ${original.result.rows.length} vs ${materialized.result.rows.length}`,
  };
}

async function testRefreshPerformance(): Promise<TestResult> {
  console.log("\n=== Testing Refresh Performance ===");

  const start = performance.now();

  try {
    // Test refresh of one view
    const result = await db.execute(sql`SELECT refresh_compliance_stats()`);
    const refreshResult = result.rows[0];

    const end = performance.now();
    const refreshTime = Math.round(end - start);

    console.log(`  Refresh time: ${refreshTime}ms`);
    console.log(`  Refresh result: ${JSON.stringify(refreshResult)}`);

    const success =
      refreshResult && String(refreshResult.status) === "COMPLETED";
    const fastEnough = refreshTime < 30000; // Less than 30 seconds

    return {
      testName: "Refresh Performance",
      originalQueryTime: refreshTime,
      materializedViewTime: 0,
      improvementPct: 0,
      rowCountMatch: true,
      status: success && fastEnough ? "PASS" : "FAIL",
      details: `Refresh took ${refreshTime}ms, Status: ${refreshResult?.status || "UNKNOWN"}`,
    };
  } catch (error) {
    const end = performance.now();
    const refreshTime = Math.round(end - start);

    return {
      testName: "Refresh Performance",
      originalQueryTime: refreshTime,
      materializedViewTime: 0,
      improvementPct: 0,
      rowCountMatch: false,
      status: "FAIL",
      details: `Refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function testViewHealth(): Promise<TestResult> {
  console.log("\n=== Testing View Health ===");

  try {
    const healthResult = await db.execute(
      sql`SELECT *
                FROM get_mv_refresh_status()`,
    );
    const healthRows = healthResult.rows;

    console.log(`  Found ${healthRows.length} materialized views`);

    let healthyViews = 0;
    const totalViews = healthRows.length;

    for (const view of healthRows) {
      const lastRefresh = view.last_refresh
        ? new Date(String(view.last_refresh))
        : null;
      const successRate = Number(view.success_rate) || 0;

      const isHealthy =
        lastRefresh &&
        lastRefresh > new Date(Date.now() - 2 * 60 * 60 * 1000) && // Refreshed within 2 hours
        successRate >= 80; // At least 80% success rate

      if (isHealthy) healthyViews++;

      console.log(
        `    ${view.view_name}: ${successRate}% success, last refresh ${lastRefresh ? lastRefresh.toISOString() : "never"}`,
      );
    }

    const healthRatio = totalViews > 0 ? healthyViews / totalViews : 0;
    const isHealthy = healthRatio >= 0.75; // At least 75% of views healthy

    return {
      testName: "View Health",
      originalQueryTime: 0,
      materializedViewTime: 0,
      improvementPct: Math.round(healthRatio * 100),
      rowCountMatch: totalViews >= 4, // Should have all 4 expected views
      status: isHealthy && totalViews >= 4 ? "PASS" : "FAIL",
      details: `${healthyViews}/${totalViews} views healthy (${Math.round(healthRatio * 100)}%)`,
    };
  } catch (error) {
    return {
      testName: "View Health",
      originalQueryTime: 0,
      materializedViewTime: 0,
      improvementPct: 0,
      rowCountMatch: false,
      status: "FAIL",
      details: `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function runAllTests(): Promise<void> {
  console.log("🚀 Starting Materialized Views Performance Tests");
  console.log("================================================");

  const tests = [
    testComplianceStats,
    testMedicationUsage,
    testInventoryConsumption,
    testAnimalHealthTrends,
    testRefreshPerformance,
    testViewHealth,
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
    } catch (error) {
      console.error(`Test failed with error: ${error}`);
      results.push({
        testName: test.name,
        originalQueryTime: 0,
        materializedViewTime: 0,
        improvementPct: 0,
        rowCountMatch: false,
        status: "FAIL",
        details: `Exception: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  // Display results
  console.log("\n📊 Test Results Summary");
  console.log("========================");
  console.table(
    results.map((r) => ({
      Test: r.testName,
      Status: r.status,
      "Original (ms)": r.originalQueryTime || "-",
      "Optimized (ms)": r.materializedViewTime || "-",
      Improvement: r.improvementPct > 0 ? `${r.improvementPct}%` : "-",
      "Data Match": r.rowCountMatch ? "✅" : "❌",
      Details: r.details || "",
    })),
  );

  // Overall summary
  const passed = results.filter((r) => r.status === "PASS").length;
  const total = results.length;
  const overallSuccess = passed / total;

  console.log(
    `\n📈 Overall Results: ${passed}/${total} tests passed (${Math.round(overallSuccess * 100)}%)`,
  );

  if (overallSuccess >= 0.8) {
    console.log("✅ Materialized views deployment successful!");
  } else if (overallSuccess >= 0.6) {
    console.log("⚠️  Materialized views partially working - review failures");
  } else {
    console.log("❌ Materialized views deployment needs attention");
  }

  // Performance summary
  const performanceTests = results.filter(
    (r) => r.originalQueryTime > 0 && r.materializedViewTime > 0,
  );
  if (performanceTests.length > 0) {
    const avgImprovement =
      performanceTests.reduce((sum, r) => sum + r.improvementPct, 0) /
      performanceTests.length;
    console.log(
      `🚀 Average performance improvement: ${Math.round(avgImprovement)}%`,
    );

    if (avgImprovement >= 70) {
      console.log("🎉 Excellent performance gains achieved!");
    } else if (avgImprovement >= 50) {
      console.log("👍 Good performance improvements");
    } else {
      console.log("📝 Consider optimizing further");
    }
  }

  process.exit(overallSuccess >= 0.8 ? 0 : 1);
}

// Handle process termination gracefully
process.on("SIGINT", () => {
  console.log("\n⏹️  Test interrupted by user");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled rejection:", reason);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  console.error("💥 Test suite failed:", error);
  process.exit(1);
});
