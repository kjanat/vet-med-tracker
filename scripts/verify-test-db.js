#!/usr/bin/env node

/**
 * Simple verification script for test database setup
 * This script tests the database configuration without TypeScript compilation
 */

const postgres = require("postgres");

async function verifyTestDatabase() {
	console.log("🧪 Verifying test database setup...");

	const config = {
		host: process.env.TEST_DB_HOST || "localhost",
		port: Number(process.env.TEST_DB_PORT) || 5432,
		user: process.env.TEST_DB_USER || "postgres",
		password: process.env.TEST_DB_PASSWORD || "postgres",
		database: process.env.TEST_DB_NAME || "vet_med_test",
	};

	console.log(`📋 Test Database Config:`);
	console.log(`   Host: ${config.host}`);
	console.log(`   Port: ${config.port}`);
	console.log(`   Database: ${config.database}`);
	console.log(`   User: ${config.user}`);

	// Test connection
	const connectionUrl = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
	
	let sql;
	try {
		sql = postgres(connectionUrl, {
			max: 1,
			ssl: false,
			prepare: false,
			debug: false,
		});

		// Test basic query
		console.log("🔌 Testing database connection...");
		const result = await sql`SELECT 1 as test, version() as pg_version`;
		console.log("✅ Connection successful!");
		console.log(`   PostgreSQL Version: ${result[0].pg_version.split(' on ')[0]}`);

		// Test table existence
		console.log("🗂️  Checking for tables...");
		const tables = await sql`
			SELECT table_name 
			FROM information_schema.tables 
			WHERE table_schema = 'public' 
			AND table_name LIKE 'vetmed_%'
			ORDER BY table_name
		`;

		if (tables.length > 0) {
			console.log(`✅ Found ${tables.length} vetmed_ tables:`);
			tables.forEach(table => {
				console.log(`   - ${table.table_name}`);
			});
		} else {
			console.log("⚠️  No vetmed_ tables found. Run migrations with:");
			console.log("   pnpm db:test:init");
		}

		return true;
	} catch (error) {
		console.error("❌ Database verification failed:");
		console.error(`   Error: ${error.message}`);
		
		if (error.message.includes("does not exist")) {
			console.log("\n💡 To fix this:");
			console.log("   1. Ensure PostgreSQL is running");
			console.log("   2. Create the test database: pnpm db:test:init");
		} else if (error.message.includes("Connection refused")) {
			console.log("\n💡 To fix this:");
			console.log("   1. Start PostgreSQL service");
			console.log("   2. Check connection settings");
		}
		
		return false;
	} finally {
		if (sql) {
			await sql.end();
		}
	}
}

// Run verification
verifyTestDatabase()
	.then(success => {
		if (success) {
			console.log("\n🎉 Test database setup verification completed successfully!");
		} else {
			console.log("\n💥 Test database verification failed!");
			process.exit(1);
		}
	})
	.catch(error => {
		console.error("Unhandled error during verification:", error);
		process.exit(1);
	});