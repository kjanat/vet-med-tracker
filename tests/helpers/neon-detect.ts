/**
 * Shared Neon database URL detection for test helpers.
 *
 * Both db-utils.ts and test-db.ts need to know whether a Neon-compatible
 * database is available. This module centralises that check so the logic
 * isn't duplicated.
 */

/** Resolve a test-usable database URL from environment variables. */
export const testDatabaseUrl: string =
	process.env.TEST_DATABASE_URL ||
	process.env.DATABASE_URL_UNPOOLED ||
	process.env.DATABASE_URL ||
	"";

/**
 * Neon's HTTP driver requires a neon.tech (or neon.database) host.
 * Standard PostgreSQL URLs (e.g. localhost) won't work.
 */
export const isNeonUrl: boolean =
	testDatabaseUrl.includes("neon.tech") ||
	testDatabaseUrl.includes("neon.database");

/** True when a Neon-compatible database URL is available for integration tests. */
export const hasTestDatabase: boolean = Boolean(testDatabaseUrl) && isNeonUrl;
