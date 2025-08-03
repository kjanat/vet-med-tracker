/**
 * Example usage of database timeout functionality
 * This file demonstrates how to use the timeout utilities in the VetMed Tracker
 */

import { eq, sql } from "drizzle-orm";
import {
	createTimedDatabaseOperation,
	DatabaseTimeoutError,
	db,
	executeWithTimeout,
	TIMEOUT_CONFIG,
	tenantDb,
	timedOperations,
	withDatabaseTimeout,
} from "@/db/drizzle";
import { animals } from "@/db/schema";

// Example 1: Using timedOperations for common patterns
async function exampleTimedOperations() {
	console.log("🕐 Example 1: Using timedOperations");

	try {
		// Read operation with 3-second timeout
		const result = await timedOperations.read(
			() => db.select().from(animals).limit(10),
			"fetch-animals-list",
		);
		console.log("✅ Read operation completed:", result.length, "animals");

		// Write operation with 5-second timeout
		await timedOperations.write(
			() =>
				db
					.update(animals)
					.set({ updatedAt: new Date().toISOString() })
					.where(eq(animals.id, "example-id")),
			"update-animal-timestamp",
		);
		console.log("✅ Write operation completed");

		// Health check with 2-second timeout
		await timedOperations.healthCheck(
			() => db.select().from(animals).limit(1),
			"health-check",
		);
		console.log("✅ Health check completed");

		// Analytics operation with 10-second timeout
		const analytics = await timedOperations.analytics(
			() =>
				db
					.select({ count: sql<number>`count(*)` })
					.from(animals)
					.groupBy(animals.householdId),
			"animal-count-by-household",
		);
		console.log("✅ Analytics operation completed:", analytics);
	} catch (error) {
		if (error instanceof DatabaseTimeoutError) {
			console.error(
				`❌ Operation timed out after ${error.timeoutMs}ms:`,
				error.operation,
			);
		} else {
			console.error("❌ Operation failed:", error);
		}
	}
}

// Example 2: Using executeWithTimeout with custom configuration
async function exampleExecuteWithTimeout() {
	console.log("🕐 Example 2: Using executeWithTimeout");

	try {
		// Custom read operation with specific timeout type
		const result = await executeWithTimeout(
			() =>
				db
					.select()
					.from(animals)
					.where(eq(animals.householdId, "household-123")),
			"READ",
			"fetch-household-animals",
		);
		console.log(
			"✅ Custom read operation completed:",
			result.length,
			"animals",
		);

		// Batch operation with longer timeout
		await executeWithTimeout(
			async () => {
				// Simulate a batch operation
				for (let i = 0; i < 10; i++) {
					await db.select().from(animals).limit(100);
				}
			},
			"BATCH",
			"bulk-animal-processing",
		);
		console.log("✅ Batch operation completed");
	} catch (error) {
		if (error instanceof DatabaseTimeoutError) {
			console.error(`❌ Batch operation timed out after ${error.timeoutMs}ms`);
		} else {
			console.error("❌ Batch operation failed:", error);
		}
	}
}

// Example 3: Using withDatabaseTimeout with custom timeouts
async function exampleCustomTimeouts() {
	console.log("🕐 Example 3: Using custom timeouts");

	try {
		// Very short timeout for demonstration
		await withDatabaseTimeout(() => db.select().from(animals).limit(1), {
			timeoutMs: 1000, // 1 second
			operationName: "quick-animal-check",
		});
		console.log("✅ Quick operation completed");

		// Operation with specific type but custom timeout
		await withDatabaseTimeout(
			() => {
				// Simulate complex analytics
				return db.select().from(animals).limit(1000);
			},
			{
				operationType: "ANALYTICS",
				operationName: "complex-animal-analytics",
			},
		);
		console.log("✅ Complex analytics completed");
	} catch (error) {
		if (error instanceof DatabaseTimeoutError) {
			console.error(
				`❌ Custom timeout operation failed after ${error.timeoutMs}ms`,
			);
		} else {
			console.error("❌ Custom operation failed:", error);
		}
	}
}

// Example 4: Using createTimedDatabaseOperation for reusable operations
async function exampleCreateTimedOperation() {
	console.log("🕐 Example 4: Using createTimedDatabaseOperation");

	// Create a reusable timed operation
	const timedAnimalFetch = createTimedDatabaseOperation<
		[string], // householdId parameter
		{ id: string; name: string }[] // return type
	>("READ", "fetch-animals-by-household");

	const fetchAnimalsByHousehold = timedAnimalFetch(
		async (householdId: string) => {
			return db
				.select({ id: animals.id, name: animals.name })
				.from(animals)
				.where(eq(animals.householdId, householdId));
		},
	);

	try {
		const result = await fetchAnimalsByHousehold("household-123");
		console.log("✅ Timed operation completed:", result.length, "animals");
	} catch (error) {
		if (error instanceof DatabaseTimeoutError) {
			console.error(`❌ Timed operation failed after ${error.timeoutMs}ms`);
		} else {
			console.error("❌ Timed operation failed:", error);
		}
	}
}

// Example 5: Using tenantDb with timeout options
async function exampleTenantDbWithTimeout() {
	console.log("🕐 Example 5: Using tenantDb with timeout");

	try {
		const result = await tenantDb(
			"household-123",
			(tx) => tx.select().from(animals).limit(10),
			{
				operationType: "READ",
				operationName: "tenant-animal-fetch",
			},
		);
		console.log("✅ Tenant operation completed:", result.length, "animals");

		// Write operation with tenant isolation and timeout
		await tenantDb(
			"household-123",
			(tx) =>
				tx
					.update(animals)
					.set({ updatedAt: new Date().toISOString() })
					.where(eq(animals.householdId, "household-123")),
			{
				operationType: "WRITE",
				operationName: "tenant-animal-update",
			},
		);
		console.log("✅ Tenant write operation completed");
	} catch (error) {
		if (error instanceof DatabaseTimeoutError) {
			console.error(`❌ Tenant operation timed out after ${error.timeoutMs}ms`);
		} else {
			console.error("❌ Tenant operation failed:", error);
		}
	}
}

// Example 6: Timeout configuration overview
function exampleTimeoutConfig() {
	console.log("🕐 Example 6: Timeout configuration overview");
	console.log("Current timeout configuration:");

	for (const [operation, timeoutMs] of Object.entries(TIMEOUT_CONFIG)) {
		console.log(`  ${operation}: ${timeoutMs}ms (${timeoutMs / 1000}s)`);
	}

	console.log("\nUsage recommendations:");
	console.log("  READ: Use for SELECT queries, quick lookups");
	console.log("  WRITE: Use for INSERT, UPDATE, DELETE operations");
	console.log("  MIGRATION: Use for schema changes, large data migrations");
	console.log("  BATCH: Use for bulk operations, data processing");
	console.log("  HEALTH_CHECK: Use for system health verification");
	console.log("  ANALYTICS: Use for complex queries, reporting");
}

// Example 7: Error handling patterns
async function exampleErrorHandling() {
	console.log("🕐 Example 7: Error handling patterns");

	try {
		// Intentionally cause a timeout (very short timeout)
		await withDatabaseTimeout(
			() => {
				// Simulate a slow operation
				return new Promise((resolve) => setTimeout(resolve, 2000));
			},
			{
				timeoutMs: 100, // 100ms - very short
				operationName: "intentional-timeout-test",
			},
		);
	} catch (error) {
		if (error instanceof DatabaseTimeoutError) {
			console.log("✅ Successfully caught timeout error:");
			console.log(`  Operation: ${error.operation}`);
			console.log(`  Timeout: ${error.timeoutMs}ms`);
			console.log(`  Message: ${error.message}`);
		} else {
			console.error("❌ Unexpected error:", error);
		}
	}
}

// Run all examples
export async function runTimeoutExamples() {
	console.log("🚀 Starting database timeout examples\n");

	await exampleTimedOperations();
	console.log();

	await exampleExecuteWithTimeout();
	console.log();

	await exampleCustomTimeouts();
	console.log();

	await exampleCreateTimedOperation();
	console.log();

	await exampleTenantDbWithTimeout();
	console.log();

	exampleTimeoutConfig();
	console.log();

	await exampleErrorHandling();
	console.log();

	console.log("✅ All timeout examples completed!");
}

// Export individual examples for selective testing
export {
	exampleTimedOperations,
	exampleExecuteWithTimeout,
	exampleCustomTimeouts,
	exampleCreateTimedOperation,
	exampleTenantDbWithTimeout,
	exampleTimeoutConfig,
	exampleErrorHandling,
};
