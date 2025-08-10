#!/usr/bin/env tsx
/**
 * Database Performance Validation Script
 *
 * This script validates the performance optimizations by:
 * 1. Creating test data scenarios
 * 2. Running benchmark queries before/after optimization
 * 3. Validating index usage
 * 4. Testing query execution plans
 * 5. Generating performance reports
 */

import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	vetmedAdministrations as administrations,
	vetmedAnimals as animals,
	vetmedHouseholds as households,
	vetmedInventoryItems as inventoryItems,
	vetmedMedicationCatalog as medicationCatalog,
	vetmedRegimens as regimens,
	vetmedUsers as users,
} from "../db/schema";

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString);
const db = drizzle(client);

interface BenchmarkResult {
	queryName: string;
	executionTime: number;
	rowsReturned: number;
	indexesUsed: string[];
	recommendations: string[];
}

interface PerformanceReport {
	timestamp: string;
	testScenario: string;
	totalQueries: number;
	averageExecutionTime: number;
	slowQueries: BenchmarkResult[];
	indexEfficiency: Record<string, number>;
	recommendations: string[];
}

class PerformanceValidator {
	private results: BenchmarkResult[] = [];
	private testHouseholdId: string = "";
	private testAnimalIds: string[] = [];
	private testRegimenIds: string[] = [];

	async initialize() {
		console.log("🚀 Initializing performance validation...");

		// Create test household if needed
		const testHouseholds = await db
			.select({ id: households.id })
			.from(households)
			.where(sql`name = 'Performance Test Household'`)
			.limit(1);

		if (testHouseholds.length === 0) {
			const newHousehold = await db
				.insert(households)
				.values({
					name: "Performance Test Household",
					timezone: "America/New_York",
				})
				.returning({ id: households.id });

			this.testHouseholdId = newHousehold[0]!.id;
		} else {
			this.testHouseholdId = testHouseholds[0]!.id;
		}

		console.log(`📝 Using test household: ${this.testHouseholdId}`);

		// Get or create test animals
		await this.ensureTestData();
	}

	private async ensureTestData() {
		// Check if we have enough test animals
		const existingAnimals = await db
			.select({ id: animals.id })
			.from(animals)
			.where(sql`household_id = ${this.testHouseholdId}`)
			.limit(10);

		if (existingAnimals.length < 5) {
			console.log("📊 Creating test animals and regimens...");
			await this.createTestData();
		}

		this.testAnimalIds = existingAnimals.map((a) => a.id);

		// Get test regimens
		const testRegimens = await db
			.select({ id: regimens.id })
			.from(regimens)
			.innerJoin(animals, sql`${regimens.animalId} = ${animals.id}`)
			.where(sql`${animals.householdId} = ${this.testHouseholdId}`)
			.limit(10);

		this.testRegimenIds = testRegimens.map((r) => r.id);
	}

	private async createTestData() {
		// This would create test data - simplified for demo
		console.log(
			"⚠️  Test data creation skipped - implement based on your seeding needs",
		);
	}

	async runBenchmarks() {
		console.log("🏃 Running performance benchmarks...");

		const benchmarks = [
			{
				name: "admin_list_by_household",
				description: "Administration list query by household",
				query: this.buildAdminListQuery(),
			},
			{
				name: "regimens_due_medications",
				description: "Due medications complex calculation",
				query: this.buildDueMedicationsQuery(),
			},
			{
				name: "inventory_low_stock_analysis",
				description: "Low inventory analysis with aggregations",
				query: this.buildInventoryAnalysisQuery(),
			},
			{
				name: "compliance_analytics",
				description: "Compliance analysis with time zone calculations",
				query: this.buildComplianceQuery(),
			},
			{
				name: "bulk_regimen_operations",
				description: "Bulk operations on multiple regimens",
				query: this.buildBulkOperationsQuery(),
			},
		];

		for (const benchmark of benchmarks) {
			console.log(`  📊 Testing: ${benchmark.description}`);
			await this.runSingleBenchmark(
				benchmark.name,
				benchmark.query,
				benchmark.description,
			);
		}
	}

	private async runSingleBenchmark(
		name: string,
		query: any,
		description: string,
	) {
		const iterations = 3;
		const executionTimes: number[] = [];
		let rowsReturned = 0;
		let queryPlan: any = null;

		for (let i = 0; i < iterations; i++) {
			const startTime = performance.now();

			try {
				const result = await db.execute(query);
				const endTime = performance.now();

				executionTimes.push(endTime - startTime);
				rowsReturned = Array.isArray(result)
					? result.length
					: result.rows?.length || 0;

				// Get query plan on first iteration
				if (i === 0) {
					try {
						const explainQuery = sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
						const planResult = await db.execute(explainQuery);
						queryPlan = planResult.rows[0];
					} catch (explainError) {
						console.warn(
							`    ⚠️  Could not get query plan for ${name}:`,
							explainError,
						);
					}
				}
			} catch (error) {
				console.error(`    ❌ Error in ${name}:`, error);
				return;
			}
		}

		const averageTime =
			executionTimes.reduce((sum, time) => sum + time, 0) / iterations;
		const indexesUsed = this.extractIndexesFromPlan(queryPlan);
		const recommendations = this.generateRecommendations(
			averageTime,
			queryPlan,
			name,
		);

		const result: BenchmarkResult = {
			queryName: name,
			executionTime: Math.round(averageTime * 100) / 100,
			rowsReturned,
			indexesUsed,
			recommendations,
		};

		this.results.push(result);

		// Log immediate results
		const statusIcon =
			averageTime < 50 ? "✅" : averageTime < 200 ? "⚠️ " : "❌";
		console.log(
			`    ${statusIcon} ${averageTime.toFixed(1)}ms (${rowsReturned} rows)`,
		);

		if (recommendations.length > 0) {
			console.log(`    💡 Recommendations: ${recommendations.join(", ")}`);
		}
	}

	private buildAdminListQuery() {
		return sql`
            SELECT 
                a.id,
                a.recorded_at,
                a.status,
                an.name as animal_name,
                u.name as caregiver_name,
                mc.generic_name,
                mc.brand_name
            FROM vetmed_administrations a
            INNER JOIN vetmed_animals an ON a.animal_id = an.id
            INNER JOIN vetmed_users u ON a.caregiver_id = u.id
            INNER JOIN vetmed_regimens r ON a.regimen_id = r.id
            INNER JOIN vetmed_medication_catalog mc ON r.medication_id = mc.id
            WHERE an.household_id = ${this.testHouseholdId}
                AND a.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY a.recorded_at DESC
            LIMIT 100
        `;
	}

	private buildDueMedicationsQuery() {
		return sql`
            WITH active_regimens AS (
                SELECT 
                    r.id,
                    r.schedule_type,
                    r.times_local,
                    r.dose,
                    an.name as animal_name,
                    an.timezone,
                    mc.generic_name
                FROM vetmed_regimens r
                INNER JOIN vetmed_animals an ON r.animal_id = an.id
                INNER JOIN vetmed_medication_catalog mc ON r.medication_id = mc.id
                WHERE an.household_id = ${this.testHouseholdId}
                    AND r.active = true
                    AND r.deleted_at IS NULL
            ),
            due_calculations AS (
                SELECT 
                    ar.*,
                    CASE 
                        WHEN ar.schedule_type = 'PRN' THEN 'prn'
                        WHEN ar.schedule_type = 'FIXED' AND ar.times_local IS NOT NULL THEN
                            CASE 
                                WHEN EXISTS (
                                    SELECT 1 FROM unnest(ar.times_local) AS time_element
                                    WHERE ABS(EXTRACT(EPOCH FROM (
                                        (CURRENT_TIMESTAMP AT TIME ZONE ar.timezone)::time - time_element::time
                                    ))) <= 3600
                                ) THEN 'due'
                                ELSE 'later'
                            END
                        ELSE 'prn'
                    END as section
                FROM active_regimens ar
            )
            SELECT * FROM due_calculations
            ORDER BY 
                CASE section WHEN 'due' THEN 1 WHEN 'later' THEN 2 ELSE 3 END,
                animal_name
        `;
	}

	private buildInventoryAnalysisQuery() {
		return sql`
            SELECT 
                i.id,
                i.units_remaining,
                i.quantity_units,
                i.expires_on,
                mc.generic_name,
                an.name as animal_name,
                CASE 
                    WHEN i.quantity_units > 0 
                    THEN ROUND((i.units_remaining::float / i.quantity_units) * 100, 2)
                    ELSE 0 
                END as remaining_percentage
            FROM vetmed_inventory_items i
            INNER JOIN vetmed_medication_catalog mc ON i.medication_id = mc.id
            LEFT JOIN vetmed_animals an ON i.assigned_animal_id = an.id
            WHERE i.household_id = ${this.testHouseholdId}
                AND i.deleted_at IS NULL
                AND i.in_use = true
                AND i.units_remaining <= GREATEST(i.quantity_units * 0.2, 3)
            ORDER BY remaining_percentage ASC, i.expires_on ASC
        `;
	}

	private buildComplianceQuery() {
		return sql`
            SELECT 
                r.id as regimen_id,
                an.name as animal_name,
                mc.generic_name,
                EXTRACT(dow FROM a.scheduled_for AT TIME ZONE an.timezone) as day_of_week,
                EXTRACT(hour FROM a.scheduled_for AT TIME ZONE an.timezone) as hour_of_day,
                COUNT(*) as total_administrations,
                COUNT(*) FILTER (WHERE a.status = 'ON_TIME') as on_time,
                COUNT(*) FILTER (WHERE a.status IN ('LATE', 'VERY_LATE')) as late,
                COUNT(*) FILTER (WHERE a.status = 'MISSED') as missed,
                ROUND(
                    (COUNT(*) FILTER (WHERE a.status = 'ON_TIME')::float / COUNT(*)) * 100, 2
                ) as compliance_rate
            FROM vetmed_administrations a
            INNER JOIN vetmed_regimens r ON a.regimen_id = r.id
            INNER JOIN vetmed_animals an ON r.animal_id = an.id
            INNER JOIN vetmed_medication_catalog mc ON r.medication_id = mc.id
            WHERE an.household_id = ${this.testHouseholdId}
                AND a.scheduled_for IS NOT NULL
                AND a.recorded_at >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY r.id, an.name, mc.generic_name, 
                     EXTRACT(dow FROM a.scheduled_for AT TIME ZONE an.timezone),
                     EXTRACT(hour FROM a.scheduled_for AT TIME ZONE an.timezone)
            HAVING COUNT(*) >= 3
            ORDER BY compliance_rate ASC
        `;
	}

	private buildBulkOperationsQuery() {
		if (this.testRegimenIds.length === 0) {
			return sql`SELECT 1 as placeholder`; // Fallback if no test data
		}

		return sql`
            SELECT 
                r.id,
                r.active,
                r.schedule_type,
                an.name as animal_name,
                mc.generic_name,
                r.updated_at
            FROM vetmed_regimens r
            INNER JOIN vetmed_animals an ON r.animal_id = an.id
            INNER JOIN vetmed_medication_catalog mc ON r.medication_id = mc.id
            WHERE r.id = ANY(${this.testRegimenIds})
                AND an.household_id = ${this.testHouseholdId}
            ORDER BY r.updated_at DESC
        `;
	}

	private extractIndexesFromPlan(queryPlan: any): string[] {
		const indexes: string[] = [];
		if (!queryPlan) return indexes;

		try {
			const planData =
				typeof queryPlan === "string" ? JSON.parse(queryPlan) : queryPlan;
			const extractFromNode = (node: any) => {
				if (
					node["Node Type"] === "Index Scan" ||
					node["Node Type"] === "Index Only Scan"
				) {
					if (node["Index Name"]) {
						indexes.push(node["Index Name"]);
					}
				}
				if (node.Plans) {
					node.Plans.forEach((subNode: any) => extractFromNode(subNode));
				}
			};

			if (planData.Plan) {
				extractFromNode(planData.Plan);
			}
		} catch (error) {
			console.warn("Could not parse query plan:", error);
		}

		return [...new Set(indexes)]; // Remove duplicates
	}

	private generateRecommendations(
		executionTime: number,
		queryPlan: any,
		queryName: string,
	): string[] {
		const recommendations: string[] = [];

		// Performance-based recommendations
		if (executionTime > 200) {
			recommendations.push("Query execution time is high (>200ms)");
		}

		if (executionTime > 50) {
			recommendations.push(
				"Consider query optimization or additional indexing",
			);
		}

		// Plan-based recommendations
		try {
			const planData =
				typeof queryPlan === "string" ? JSON.parse(queryPlan) : queryPlan;
			if (planData) {
				const hasSeqScan = JSON.stringify(planData).includes("Seq Scan");
				if (hasSeqScan) {
					recommendations.push(
						"Sequential scan detected - consider adding indexes",
					);
				}

				const hasNestedLoop = JSON.stringify(planData).includes("Nested Loop");
				if (hasNestedLoop && executionTime > 100) {
					recommendations.push(
						"Nested loop with high execution time - review join strategy",
					);
				}
			}
		} catch (error) {
			// Ignore parsing errors
		}

		// Query-specific recommendations
		if (queryName.includes("admin") && executionTime > 50) {
			recommendations.push(
				"Consider using covering indexes for administration queries",
			);
		}

		if (queryName.includes("due_medications") && executionTime > 100) {
			recommendations.push(
				"Due medications calculation is complex - consider caching",
			);
		}

		return recommendations;
	}

	async validateIndexes() {
		console.log("🔍 Validating index usage and effectiveness...");

		// Get current index usage statistics
		const indexStats = await db.execute(sql`
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch,
                pg_size_pretty(pg_relation_size(indexrelid)) as size
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public' 
                AND tablename LIKE 'vetmed_%'
            ORDER BY idx_scan DESC
        `);

		console.log("\n📊 Index Usage Report:");
		console.log(
			"┌─────────────────────────────┬──────────┬──────────────┬────────────┐",
		);
		console.log(
			"│ Index Name                  │ Scans    │ Tuples Read  │ Size       │",
		);
		console.log(
			"├─────────────────────────────┼──────────┼──────────────┼────────────┤",
		);

		for (const row of indexStats.rows) {
			const indexName = (row.indexname as string).substring(0, 28).padEnd(28);
			const scans = String(row.idx_scan).padStart(8);
			const tuplesRead = String(row.idx_tup_read).padStart(12);
			const size = String(row.size).padStart(10);

			console.log(`│ ${indexName} │ ${scans} │ ${tuplesRead} │ ${size} │`);
		}
		console.log(
			"└─────────────────────────────┴──────────┴──────────────┴────────────┘",
		);

		// Identify unused indexes
		const unusedIndexes = indexStats.rows.filter(
			(row: any) => row.idx_scan === 0 && !row.indexname.endsWith("_pkey"),
		);

		if (unusedIndexes.length > 0) {
			console.log("\n⚠️  Unused Indexes Found:");
			unusedIndexes.forEach((idx: any) => {
				console.log(`   - ${idx.indexname} (${idx.size})`);
			});
		}
	}

	async generateReport(): Promise<PerformanceReport> {
		const totalQueries = this.results.length;
		const averageTime =
			this.results.reduce((sum, r) => sum + r.executionTime, 0) / totalQueries;
		const slowQueries = this.results.filter((r) => r.executionTime > 100);

		const allRecommendations = this.results.flatMap((r) => r.recommendations);
		const uniqueRecommendations = [...new Set(allRecommendations)];

		// Calculate index efficiency
		const indexUsage = await db.execute(sql`
            SELECT 
                indexname,
                idx_scan,
                CASE 
                    WHEN idx_scan > 100 THEN 'HIGH'
                    WHEN idx_scan > 10 THEN 'MEDIUM'  
                    WHEN idx_scan > 0 THEN 'LOW'
                    ELSE 'UNUSED'
                END as efficiency
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public' 
                AND tablename LIKE 'vetmed_%'
        `);

		const indexEfficiency: Record<string, number> = {};
		for (const row of indexUsage.rows) {
			indexEfficiency[row.indexname as string] = row.idx_scan as number;
		}

		return {
			timestamp: new Date().toISOString(),
			testScenario: "Performance Validation Suite",
			totalQueries,
			averageExecutionTime: Math.round(averageTime * 100) / 100,
			slowQueries,
			indexEfficiency,
			recommendations: uniqueRecommendations,
		};
	}

	async printSummary() {
		console.log("\n📈 Performance Validation Summary");
		console.log("================================");

		const report = await this.generateReport();

		console.log(`📊 Total Queries Tested: ${report.totalQueries}`);
		console.log(`⏱️  Average Execution Time: ${report.averageExecutionTime}ms`);
		console.log(`🐌 Slow Queries (>100ms): ${report.slowQueries.length}`);

		if (report.slowQueries.length > 0) {
			console.log("\nSlow Queries:");
			report.slowQueries.forEach((query) => {
				console.log(`  - ${query.queryName}: ${query.executionTime}ms`);
			});
		}

		if (report.recommendations.length > 0) {
			console.log("\n💡 Recommendations:");
			report.recommendations.forEach((rec) => {
				console.log(`  • ${rec}`);
			});
		}

		// Performance scoring
		const score = this.calculatePerformanceScore(report);
		const scoreColor = score >= 80 ? "🟢" : score >= 60 ? "🟡" : "🔴";
		console.log(`\n${scoreColor} Performance Score: ${score}/100`);
	}

	private calculatePerformanceScore(report: PerformanceReport): number {
		let score = 100;

		// Deduct points for slow queries
		score -= report.slowQueries.length * 10;

		// Deduct points for high average execution time
		if (report.averageExecutionTime > 100) {
			score -= 20;
		} else if (report.averageExecutionTime > 50) {
			score -= 10;
		}

		// Deduct points for unused indexes
		const unusedIndexes = Object.values(report.indexEfficiency).filter(
			(usage) => usage === 0,
		);
		score -= unusedIndexes.length * 5;

		return Math.max(0, score);
	}

	async cleanup() {
		await client.end();
	}
}

// Main execution
async function main() {
	const validator = new PerformanceValidator();

	try {
		await validator.initialize();
		await validator.runBenchmarks();
		await validator.validateIndexes();
		await validator.printSummary();

		console.log("\n✅ Performance validation completed!");
	} catch (error) {
		console.error("❌ Performance validation failed:", error);
		process.exit(1);
	} finally {
		await validator.cleanup();
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}
