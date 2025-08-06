#!/usr/bin/env tsx

/**
 * Test runner script for health endpoint integration tests
 *
 * This script provides an easy way to run and validate the health check endpoints
 * without needing to remember the specific test file path.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(__dirname, "..");
const HEALTH_ENDPOINT_TEST_FILE = resolve(
	PROJECT_ROOT,
	"tests/integration/health-endpoint.test.ts",
);

function runHealthEndpointTests() {
	console.log("🏥 Running Health Endpoint Integration Tests...");
	console.log("================================================");

	// Check if test file exists
	if (!existsSync(HEALTH_ENDPOINT_TEST_FILE)) {
		console.error(`❌ Test file not found: ${HEALTH_ENDPOINT_TEST_FILE}`);
		process.exit(1);
	}

	try {
		// Run the health endpoint tests
		execSync(`pnpm test tests/integration/health-endpoint.test.ts`, {
			cwd: PROJECT_ROOT,
			stdio: "inherit",
		});

		console.log("\n✅ Health endpoint tests completed successfully!");
		console.log("\n📊 Tests covered:");
		console.log("  • Simple health checks (liveness probe)");
		console.log("  • Readiness checks (service dependencies)");
		console.log("  • Detailed health reports (comprehensive monitoring)");
		console.log("  • Database connectivity validation");
		console.log("  • Redis connectivity validation");
		console.log("  • Circuit breaker status integration");
		console.log("  • Rate limiting behavior");
		console.log("  • Error handling scenarios");
		console.log("  • Cache behavior validation");
		console.log("  • CORS support verification");
	} catch (_error) {
		console.error("\n❌ Health endpoint tests failed!");
		console.error("Please review the test output above for details.");
		process.exit(1);
	}
}

if (require.main === module) {
	runHealthEndpointTests();
}

export { runHealthEndpointTests };
