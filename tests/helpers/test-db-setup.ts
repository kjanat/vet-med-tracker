import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { db } from "@/db/drizzle";
import * as schema from "@/db/schema";

// Test database configuration
const TEST_DB_CONFIG = {
	host: process.env.TEST_DB_HOST || "localhost",
	port: Number(process.env.TEST_DB_PORT) || 5432,
	user: process.env.TEST_DB_USER || "postgres",
	password: process.env.TEST_DB_PASSWORD || "postgres",
	database: process.env.TEST_DB_NAME || "vet_med_test",
} as const;

// Connection pool for test database
let testSql: postgres.Sql | null = null;
let testDbInstance: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create the test database connection
 */
export function getTestDatabase(): typeof db {
	if (testDbInstance) {
		return testDbInstance as typeof db;
	}

	// Create connection string for postgres.js
	const testDatabaseUrl = `postgres://${TEST_DB_CONFIG.user}:${TEST_DB_CONFIG.password}@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${TEST_DB_CONFIG.database}`;

	console.log(
		`🔧 Connecting to test database: ${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${TEST_DB_CONFIG.database}`,
	);

	// Use postgres.js for test database connections
	testSql = postgres(testDatabaseUrl, {
		// Optimize for test environment
		max: 10, // Maximum pool size
		idle_timeout: 20, // Seconds
		connect_timeout: 10, // Seconds
		prepare: false, // Disable prepared statements for better compatibility
		// Enable debug in development
		debug: process.env.NODE_ENV === "development",
		// Transform column names to camelCase to match Drizzle expectations
		transform: postgres.camel,
		// Disable SSL for local development
		ssl: false,
	});

	testDbInstance = drizzle(testSql, {
		schema,
		logger: process.env.NODE_ENV === "development",
	});

	return testDbInstance as typeof db;
}

/**
 * Create the test database if it doesn't exist
 */
export async function createTestDatabase(): Promise<void> {
	// Create admin connection to default postgres database
	const adminUrl = `postgres://${TEST_DB_CONFIG.user}:${TEST_DB_CONFIG.password}@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/postgres`;
	const adminSql = postgres(adminUrl, {
		max: 1,
		ssl: false,
		prepare: false,
	});

	try {
		// Check if test database exists
		const result = await adminSql`
			SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_CONFIG.database}
		`;

		if (result.length === 0) {
			console.log(`📦 Creating test database: ${TEST_DB_CONFIG.database}`);
			await adminSql.unsafe(`CREATE DATABASE "${TEST_DB_CONFIG.database}"`);
		} else {
			console.log(`✅ Test database exists: ${TEST_DB_CONFIG.database}`);
		}
	} catch (error) {
		console.error("Failed to create test database:", error);
		throw error;
	} finally {
		await adminSql.end();
	}
}

/**
 * Run migrations on the test database
 */
export async function runTestMigrations(): Promise<void> {
	console.log("🔄 Running test database migrations...");

	try {
		// Import and run migrations using drizzle-kit programmatically
		const { migrate } = await import("drizzle-orm/postgres-js/migrator");
		const db = getTestDatabase();

		await migrate(db, {
			migrationsFolder: "./drizzle",
		});

		console.log("✅ Test database migrations completed");
	} catch (error) {
		console.error("Failed to run test migrations:", error);
		throw error;
	}
}

/**
 * Reset the test database by truncating all tables
 */
export async function resetTestDatabase(): Promise<void> {
	const db = getTestDatabase();

	try {
		console.log("🗑️  Resetting test database...");

		// Get all table names with vetmed_ prefix
		const tablesResult = await testSql!`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name LIKE 'vetmed_%'
			ORDER BY table_name
		`;

		if (tablesResult.length > 0) {
			const tableNames = tablesResult
				.map((row) => `"${row.table_name}"`)
				.join(", ");

			// Disable foreign key checks temporarily
			await testSql!`SET session_replication_role = replica`;

			// Truncate all tables
			await testSql!.unsafe(`TRUNCATE TABLE ${tableNames} CASCADE`);

			// Re-enable foreign key checks
			await testSql!`SET session_replication_role = DEFAULT`;
		}

		console.log("✅ Test database reset completed");
	} catch (error) {
		console.error("Failed to reset test database:", error);
		throw error;
	}
}

/**
 * Initialize test database for testing
 */
export async function initializeTestDatabase(): Promise<void> {
	try {
		await createTestDatabase();
		await runTestMigrations();
		console.log("🚀 Test database initialized successfully");
	} catch (error) {
		console.error("Failed to initialize test database:", error);
		throw error;
	}
}

/**
 * Close all test database connections
 */
export async function closeTestDatabase(): Promise<void> {
	try {
		if (testSql) {
			console.log("🔌 Closing test database connections...");
			await testSql.end();
			testSql = null;
			testDbInstance = null;
			console.log("✅ Test database connections closed");
		}
	} catch (error) {
		console.error("Failed to close test database connections:", error);
	}
}

/**
 * Health check for test database connection
 */
export async function checkTestDatabaseHealth(): Promise<boolean> {
	try {
		const db = getTestDatabase();
		await testSql!`SELECT 1 as health_check`;
		return true;
	} catch (error) {
		console.error("Test database health check failed:", error);
		return false;
	}
}

/**
 * Get database connection info for debugging
 */
export function getTestDatabaseInfo() {
	return {
		config: TEST_DB_CONFIG,
		isConnected: testSql !== null && testDbInstance !== null,
		connectionUrl: `postgres://${TEST_DB_CONFIG.user}:***@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${TEST_DB_CONFIG.database}`,
	};
}

// Cleanup on process exit
if (typeof process !== "undefined") {
	const cleanup = async () => {
		await closeTestDatabase();
	};

	process.on("exit", cleanup);
	process.on("SIGINT", cleanup);
	process.on("SIGTERM", cleanup);
	process.on("uncaughtException", async (error) => {
		console.error("Uncaught exception in test database setup:", error);
		await cleanup();
		process.exit(1);
	});
}

// Export test database configuration for external usage
export { TEST_DB_CONFIG };
