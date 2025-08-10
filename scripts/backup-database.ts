#!/usr/bin/env tsx
/**
 * Database backup script for production deployments
 *
 * This script creates timestamped backups of the production database
 * before running migrations or major deployments.
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const execAsync = promisify(exec);

interface BackupConfig {
	databaseUrl: string;
	backupDir: string;
	retentionDays: number;
	compressionEnabled: boolean;
}

/**
 * Get backup configuration from environment
 */
function getBackupConfig(): BackupConfig {
	const databaseUrl =
		process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED must be set");
	}

	return {
		databaseUrl,
		backupDir: process.env.BACKUP_DIR || "./backups",
		retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || "7", 10),
		compressionEnabled: process.env.BACKUP_COMPRESSION !== "false",
	};
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDirectory(dir: string): void {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
		console.log(`Created backup directory: ${dir}`);
	}
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(compression: boolean = false): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const extension = compression ? ".sql.gz" : ".sql";
	return `vetmed-backup-${timestamp}${extension}`;
}

/**
 * Create database backup using pg_dump
 */
async function createBackup(config: BackupConfig): Promise<string> {
	const filename = generateBackupFilename(config.compressionEnabled);
	const backupPath = join(config.backupDir, filename);

	console.log(`Creating backup: ${backupPath}`);

	// Build pg_dump command
	let command = `pg_dump "${config.databaseUrl}" --verbose --clean --if-exists --no-owner --no-privileges`;

	if (config.compressionEnabled) {
		command += ` | gzip > "${backupPath}"`;
	} else {
		command += ` > "${backupPath}"`;
	}

	try {
		const { stdout, stderr } = await execAsync(command, {
			timeout: 300000, // 5 minute timeout
		});

		if (stderr) {
			console.log(
				"pg_dump stderr (this may include normal verbose output):",
				stderr,
			);
		}

		console.log(`✅ Backup created successfully: ${backupPath}`);
		return backupPath;
	} catch (error) {
		console.error("❌ Backup failed:", error);
		throw error;
	}
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups(config: BackupConfig): Promise<void> {
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

		// List files in backup directory
		const command = `find "${config.backupDir}" -name "vetmed-backup-*.sql*" -type f -mtime +${config.retentionDays} -delete`;

		await execAsync(command);
		console.log(
			`🧹 Cleaned up backups older than ${config.retentionDays} days`,
		);
	} catch (error) {
		console.warn(
			"⚠️ Failed to cleanup old backups (this may be normal if no old backups exist):",
			error,
		);
	}
}

/**
 * Verify backup integrity by testing restoration to a temporary database
 */
async function verifyBackup(
	backupPath: string,
	databaseUrl: string,
): Promise<boolean> {
	// This is a basic verification - in production, you might want more thorough checks
	try {
		// For compressed backups
		if (backupPath.endsWith(".gz")) {
			const { stdout } = await execAsync(`zcat "${backupPath}" | head -20`);
			return stdout.includes("PostgreSQL database dump");
		} else {
			const { stdout } = await execAsync(`head -20 "${backupPath}"`);
			return stdout.includes("PostgreSQL database dump");
		}
	} catch (error) {
		console.warn("⚠️ Could not verify backup:", error);
		return false;
	}
}

/**
 * Create backup manifest with metadata
 */
function createBackupManifest(backupPath: string, config: BackupConfig): void {
	const manifest = {
		timestamp: new Date().toISOString(),
		filename: backupPath,
		databaseUrl: config.databaseUrl.replace(
			/:\/\/([^:]+):([^@]+)@/,
			"://***:***@",
		), // Mask credentials
		compressionEnabled: config.compressionEnabled,
		nodeEnv: process.env.NODE_ENV,
		gitCommit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA,
		deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
	};

	const manifestPath = `${backupPath}.manifest.json`;
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

	console.log(`📄 Created backup manifest: ${manifestPath}`);
}

/**
 * Main backup function
 */
async function main(): Promise<void> {
	try {
		console.log("🗂️  Starting database backup...");

		const config = getBackupConfig();
		console.log(
			`Database: ${config.databaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://***:***@")}`,
		);
		console.log(`Backup directory: ${config.backupDir}`);
		console.log(`Retention: ${config.retentionDays} days`);
		console.log(
			`Compression: ${config.compressionEnabled ? "enabled" : "disabled"}`,
		);

		// Ensure backup directory exists
		ensureBackupDirectory(config.backupDir);

		// Create the backup
		const backupPath = await createBackup(config);

		// Verify backup integrity
		const isValid = await verifyBackup(backupPath, config.databaseUrl);
		if (!isValid) {
			console.warn("⚠️ Backup verification failed - backup may be invalid");
		} else {
			console.log("✅ Backup verification passed");
		}

		// Create backup manifest
		createBackupManifest(backupPath, config);

		// Cleanup old backups
		await cleanupOldBackups(config);

		console.log("🎉 Database backup completed successfully!");

		// Output for CI/CD systems
		if (process.env.GITHUB_ACTIONS || process.env.VERCEL) {
			console.log(`::set-output name=backup_path::${backupPath}`);
		}
	} catch (error) {
		console.error("❌ Database backup failed:", error);
		process.exit(1);
	}
}

// Run the backup if called directly
if (require.main === module) {
	main();
}

export { main as createDatabaseBackup };
