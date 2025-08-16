#!/usr/bin/env tsx

/**
 * Test Database Initialization Script
 *
 * This script initializes the test database for development and CI environments.
 * It creates the database if it doesn't exist, runs migrations, and optionally
 * seeds it with test data.
 *
 * Usage:
 *   pnpm run db:test:init
 *   pnpm run db:test:init --seed
 *   pnpm run db:test:init --reset
 */

import { parseArgs } from "node:util";
import {
  checkTestDatabaseHealth,
  closeTestDatabase,
  createTestDatabase,
  getTestDatabaseInfo,
  resetTestDatabase,
  runTestMigrations,
  TEST_DB_CONFIG,
} from "../tests/helpers/test-db-setup";

interface Args {
  seed?: boolean;
  reset?: boolean;
  health?: boolean;
  info?: boolean;
  help?: boolean;
}

async function seedTestDatabase(): Promise<void> {
  console.log("🌱 Seeding test database with sample data...");

  try {
    const { getTestDatabase } = await import("../tests/helpers/test-db-setup");
    const { testFactories } = await import("../tests/helpers/test-db");
    const db = getTestDatabase();
    const schema = await import("../db/schema");

    // Create a test user
    const testUser = await db
      .insert(schema.users)
      .values({
        id: "test-user-1",
        ...testFactories.user({
          email: "test@example.com",
          name: "Test User",
        }),
      })
      .returning();

    // Create a test household
    const testHousehold = await db
      .insert(schema.households)
      .values({
        ...testFactories.household({
          name: "Test Household",
        }),
      })
      .returning();

    // Create membership
    await db.insert(schema.memberships).values({
      ...testFactories.membership({
        userId: testUser[0]?.id,
        householdId: testHousehold[0]?.id,
        role: "OWNER",
      }),
    });

    // Create a test animal
    const testAnimal = await db
      .insert(schema.animals)
      .values({
        ...testFactories.animal({
          name: "Buddy",
          species: "Dog",
          householdId: testHousehold[0]?.id,
        }),
      })
      .returning();

    // Create a test medication
    const testMedication = await db
      .insert(schema.medicationCatalog)
      .values({
        ...testFactories.medication({
          genericName: "Test Medicine",
          route: "ORAL",
          form: "TABLET",
        }),
      })
      .returning();

    // Create a test regimen
    await db.insert(schema.regimens).values({
      ...testFactories.regimen({
        animalId: testAnimal[0]?.id,
        medicationId: testMedication[0]?.id,
      }),
    });

    console.log("✅ Test database seeded successfully");
    console.log(`   - User: ${testUser[0]?.email}`);
    console.log(`   - Household: ${testHousehold[0]?.name}`);
    console.log(`   - Animal: ${testAnimal[0]?.name}`);
    console.log(`   - Medication: ${testMedication[0]?.genericName}`);
  } catch (error) {
    console.error("Failed to seed test database:", error);
    throw error;
  }
}

async function healthCheck(): Promise<boolean> {
  console.log("🏥 Checking test database health...");

  const isHealthy = await checkTestDatabaseHealth();

  if (isHealthy) {
    console.log("✅ Test database is healthy");
    return true;
  } else {
    console.error("❌ Test database health check failed");
    return false;
  }
}

function printDatabaseInfo(): void {
  const info = getTestDatabaseInfo();
  console.log("📋 Test Database Information:");
  console.log(`   Host: ${info.config.host}`);
  console.log(`   Port: ${info.config.port}`);
  console.log(`   Database: ${info.config.database}`);
  console.log(`   User: ${info.config.user}`);
  console.log(`   Connected: ${info.isConnected ? "✅" : "❌"}`);
  console.log(`   URL: ${info.connectionUrl}`);
}

function printHelp(): void {
  console.log(`
🧪 Test Database Initialization Script

Usage:
  tsx scripts/init-test-db.ts [options]

Options:
  --seed     Seed the database with test data after initialization
  --reset    Reset/truncate all tables before initialization
  --health   Run health check on test database
  --info     Display database connection information
  --help     Show this help message

Environment Variables:
  TEST_DB_HOST      Database host (default: localhost)
  TEST_DB_PORT      Database port (default: 5432)
  TEST_DB_USER      Database user (default: postgres)
  TEST_DB_PASSWORD  Database password (default: postgres)  
  TEST_DB_NAME      Database name (default: vet_med_test)

Examples:
  tsx scripts/init-test-db.ts                    # Initialize database
  tsx scripts/init-test-db.ts --reset --seed     # Reset and seed database
  tsx scripts/init-test-db.ts --health           # Check database health
`);
}

async function main(): Promise<void> {
  try {
    const { values: args } = parseArgs({
      args: process.argv.slice(2),
      options: {
        seed: { type: "boolean", short: "s" },
        reset: { type: "boolean", short: "r" },
        health: { type: "boolean" },
        info: { type: "boolean", short: "i" },
        help: { type: "boolean", short: "h" },
      },
    }) as { values: Args };

    if (args.help) {
      printHelp();
      return;
    }

    if (args.info) {
      printDatabaseInfo();
      return;
    }

    if (args.health) {
      const isHealthy = await healthCheck();
      process.exit(isHealthy ? 0 : 1);
    }

    console.log("🚀 Initializing test database...");
    console.log(`   Database: ${TEST_DB_CONFIG.database}`);
    console.log(`   Host: ${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}`);

    // Step 1: Create database if it doesn't exist
    await createTestDatabase();

    // Step 2: Reset database if requested
    if (args.reset) {
      console.log("🔄 Resetting test database...");
      await resetTestDatabase();
    }

    // Step 3: Run migrations
    await runTestMigrations();

    // Step 4: Seed database if requested
    if (args.seed) {
      await seedTestDatabase();
    }

    // Step 5: Health check
    const isHealthy = await healthCheck();

    if (!isHealthy) {
      console.error(
        "❌ Database initialization completed but health check failed",
      );
      process.exit(1);
    }

    console.log("🎉 Test database initialization completed successfully!");
  } catch (error) {
    console.error("❌ Test database initialization failed:", error);
    process.exit(1);
  } finally {
    // Always close connections
    await closeTestDatabase();
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⚡ Received SIGINT, closing test database connections...");
  await closeTestDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("⚡ Received SIGTERM, closing test database connections...");
  await closeTestDatabase();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { main };
