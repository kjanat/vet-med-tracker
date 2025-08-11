/**
 * Test Database Setup and Teardown
 *
 * This module provides setup and teardown functions for test database
 * to be used with Vitest's globalSetup and globalTeardown hooks.
 */

import {
	checkTestDatabaseHealth,
	closeTestDatabase,
	getTestDatabaseInfo,
	initializeTestDatabase,
	resetTestDatabase,
} from "../helpers/test-db-setup";

/**
 * Global setup function for test database
 * Called once before all tests start
 */
export async function setupDatabase(): Promise<void> {
	console.log("🚀 Setting up test database...");

	try {
		// Initialize test database (create DB, run migrations)
		await initializeTestDatabase();

		// Verify database is healthy
		const isHealthy = await checkTestDatabaseHealth();
		if (!isHealthy) {
			throw new Error("Test database health check failed after setup");
		}

		const info = getTestDatabaseInfo();
		console.log("✅ Test database setup completed:");
		console.log(`   Database: ${info.config.database}`);
		console.log(`   Host: ${info.config.host}:${info.config.port}`);
		console.log(`   Connected: ${info.isConnected ? "✅" : "❌"}`);
	} catch (error) {
		console.error("❌ Test database setup failed:", error);
		throw error;
	}
}

/**
 * Global teardown function for test database
 * Called once after all tests complete
 */
export async function teardownDatabase(): Promise<void> {
	console.log("🔌 Tearing down test database...");

	try {
		await closeTestDatabase();
		console.log("✅ Test database teardown completed");
	} catch (error) {
		console.error("❌ Test database teardown failed:", error);
		// Don't throw here to avoid masking test failures
	}
}

/**
 * Reset database state between test suites
 * Called before each test suite
 */
export async function resetDatabaseState(): Promise<void> {
	try {
		await resetTestDatabase();
	} catch (error) {
		console.error("❌ Failed to reset database state:", error);
		throw error;
	}
}

/**
 * Utility function to verify test database is ready
 */
export async function verifyTestDatabaseReady(): Promise<void> {
	const isHealthy = await checkTestDatabaseHealth();
	if (!isHealthy) {
		throw new Error(
			"Test database is not ready. Please run 'pnpm db:test:init' first.",
		);
	}
}

/**
 * Vitest global setup function
 * Called once before all tests start
 */
export async function setup(): Promise<void> {
	await setupDatabase();
}

/**
 * Vitest global teardown function
 * Called once after all tests complete
 */
export async function teardown(): Promise<void> {
	await teardownDatabase();
}

// Export setup function as default for Vitest globalSetup
export default setup;
