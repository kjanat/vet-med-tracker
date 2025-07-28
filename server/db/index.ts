import { config } from "dotenv";
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// HTTP client for single queries (better for serverless/edge)
const sql = neon(process.env.DATABASE_URL);
export const db = drizzleHttp(sql, { schema });

// WebSocket client for transactions (when needed)
// export const dbWs = drizzleWs(process.env.DATABASE_URL, { schema });

// Helper for tenant-scoped queries
export function tenantDb<T>(
  householdId: string,
  callback: (tx: typeof db) => T | Promise<T>
): Promise<T> {
  // In a real implementation, we'd set the tenant context here
  // For now, we'll ensure all queries include householdId
  return Promise.resolve(callback(db));
}

// Export all schemas for easy access
export * from './schema';