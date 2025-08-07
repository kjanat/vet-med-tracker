#!/usr/bin/env tsx

/**
 * Migration script to split existing `name` field into `firstName` and `lastName`
 * This should be run after the database migration adds the firstName and lastName columns
 */

import { eq, isNotNull } from "drizzle-orm";
import { dbPooled as db } from "@/db/drizzle";
import { users } from "@/db/schema";

interface UserRecord {
	id: string;
	email: string;
	name: string | null;
	firstName: string | null;
	lastName: string | null;
}

function splitName(fullName: string): { firstName: string; lastName?: string } {
	if (!fullName || fullName.trim() === "") {
		return { firstName: "" };
	}

	const trimmedName = fullName.trim();
	const parts = trimmedName.split(/\s+/);

	if (parts.length === 1) {
		return { firstName: parts[0] || "" };
	}

	// If there are multiple parts, first part is firstName, rest is lastName
	const firstName = parts[0] || "";
	const lastName = parts.slice(1).join(" ") || undefined;

	return { firstName, lastName };
}

async function migrateNames() {
	console.log("🚀 Starting name migration...");

	try {
		// Get all users where:
		// 1. name is not null (has a name to split)
		// 2. firstName is null (hasn't been migrated yet)
		const usersToMigrate = (await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
				firstName: users.firstName,
				lastName: users.lastName,
			})
			.from(users)
			.where(isNotNull(users.name))) as UserRecord[];

		console.log(
			`📊 Found ${usersToMigrate.length} users with names to potentially migrate`,
		);

		if (usersToMigrate.length === 0) {
			console.log("✅ No users need name migration");
			return;
		}

		let migratedCount = 0;
		let skippedCount = 0;

		for (const user of usersToMigrate) {
			// Skip if already has firstName populated (already migrated)
			if (user.firstName) {
				skippedCount++;
				console.log(`⏭️  Skipping ${user.email} - already has firstName`);
				continue;
			}

			// Skip if name is empty/null
			if (!user.name || user.name.trim() === "") {
				skippedCount++;
				console.log(`⏭️  Skipping ${user.email} - empty name`);
				continue;
			}

			const { firstName, lastName } = splitName(user.name);

			try {
				await db
					.update(users)
					.set({
						firstName,
						lastName: lastName || null,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(users.id, user.id));

				migratedCount++;
				console.log(
					`✅ Migrated ${user.email}: "${user.name}" → firstName: "${firstName}", lastName: "${lastName || "null"}"`,
				);
			} catch (error) {
				console.error(`❌ Error migrating ${user.email}:`, error);
			}
		}

		console.log(`\n📈 Migration Summary:`);
		console.log(`   - Total users processed: ${usersToMigrate.length}`);
		console.log(`   - Successfully migrated: ${migratedCount}`);
		console.log(`   - Skipped: ${skippedCount}`);
		console.log(
			`   - Errors: ${usersToMigrate.length - migratedCount - skippedCount}`,
		);

		// Verify the migration
		console.log("\n🔍 Verification:");
		const verificationResults = await db
			.select({
				email: users.email,
				name: users.name,
				firstName: users.firstName,
				lastName: users.lastName,
			})
			.from(users)
			.where(isNotNull(users.firstName));

		console.log(
			`   - Users with firstName populated: ${verificationResults.length}`,
		);

		if (verificationResults.length > 0) {
			console.log("\nSample results:");
			verificationResults.slice(0, 5).forEach((user) => {
				console.log(
					`   - ${user.email}: name="${user.name}" → firstName="${user.firstName}" lastName="${user.lastName}"`,
				);
			});
		}

		console.log("\n✅ Name migration completed successfully!");
	} catch (error) {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	}
}

// Execute if run directly
if (require.main === module) {
	migrateNames()
		.then(() => {
			console.log("\n🎉 Migration script completed");
			process.exit(0);
		})
		.catch((error) => {
			console.error("💥 Migration script failed:", error);
			process.exit(1);
		});
}

export { migrateNames, splitName };
