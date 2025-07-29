import { neon, neonConfig, type Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleServerless } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

// Validate required environment variables
const requiredEnvVars = ["DATABASE_URL_POOLED", "DATABASE_URL_UNPOOLED"];
for (const envVar of requiredEnvVars) {
	if (!process.env[envVar]) {
		throw new Error(`${envVar} is not set. Check your .env file.`);
	}
}

// Configure Neon for serverless environments
neonConfig.fetchConnectionCache = true;

// After validation we know these are defined
const DATABASE_URL_POOLED = process.env.DATABASE_URL_POOLED as string;
const DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED as string;

// Pooled connection for API routes (short-lived queries)
// This is more efficient for Neon free tier
const sqlPooled = neon(DATABASE_URL_POOLED);
export const db = drizzleHttp(sqlPooled, {
	schema,
	logger: process.env.NODE_ENV === "development",
});

// Unpooled connection for migrations and long-running operations
// Only use when necessary (e.g., migrations, batch operations)
const sqlUnpooled = neon(DATABASE_URL_UNPOOLED);
export const dbUnpooled = drizzleHttp(sqlUnpooled, {
	schema,
	logger: process.env.NODE_ENV === "development",
});

// WebSocket connection for transactions (when needed)
// Use sparingly on free tier due to connection limits
export const dbTransaction = drizzleServerless(DATABASE_URL_UNPOOLED, {
	schema,
	logger: process.env.NODE_ENV === "development",
});

// Connection pool for better performance (when using Node.js runtime)
// Only initialize if not in edge runtime
let _pool: Pool | null = null;
if (typeof process.versions?.node !== "undefined") {
	const { Pool } = require("@neondatabase/serverless");
	_pool = new Pool({
		connectionString: process.env.DATABASE_URL_POOLED,
		// Optimize for Neon free tier
		max: 5, // Max connections
		idleTimeoutMillis: 30000, // 30 seconds
		connectionTimeoutMillis: 10000, // 10 seconds
	});
}

// Helper for tenant-scoped queries with proper isolation
export async function tenantDb<T>(
	householdId: string,
	callback: (tx: typeof db) => T | Promise<T>,
): Promise<T> {
	if (!householdId) {
		throw new Error("householdId is required for tenant-scoped queries");
	}

	// TODO: In production, implement Row Level Security (RLS) or use search_path
	// For now, we'll ensure all queries include householdId in WHERE clauses
	try {
		const result = await callback(db);
		return result;
	} catch (error) {
		console.error(`Tenant query error for household ${householdId}:`, error);
		throw error;
	}
}

// Export all schemas for easy access
export * from "./schema";
