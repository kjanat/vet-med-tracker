#!/usr/bin/env tsx

/**
 * Experimental Code Cleanup Script
 *
 * Removes experimental directory and related test files as part of the
 * architectural simplification strategy. Preserves learnings in documentation.
 */

import { exec } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

interface CleanupSummary {
  directories: string[];
  files: string[];
  totalSize: number;
  success: boolean;
  errors: string[];
}

/**
 * Calculate directory size recursively
 */
function getDirectorySize(dirPath: string): number {
  try {
    const _totalSize = 0;
    const stats = statSync(dirPath);

    if (stats.isFile()) {
      return stats.size;
    }

    if (stats.isDirectory()) {
      const { execSync } = require("node:child_process");
      const result = execSync(`du -sb "${dirPath}"`, { encoding: "utf8" });
      const size = parseInt(result.split("\t")[0], 10);
      return size || 0;
    }

    return 0;
  } catch (_error) {
    console.warn(`Warning: Could not calculate size for ${dirPath}`);
    return 0;
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

async function cleanupExperimental(): Promise<CleanupSummary> {
  const summary: CleanupSummary = {
    directories: [],
    files: [],
    totalSize: 0,
    success: false,
    errors: [],
  };

  try {
    // Define paths to cleanup
    const experimentalDir = path.join(process.cwd(), "experimental");
    const experimentalTest = path.join(
      process.cwd(),
      "components/providers/__tests__/provider-refactor.test.tsx",
    );

    // Calculate sizes before cleanup
    if (existsSync(experimentalDir)) {
      summary.totalSize += getDirectorySize(experimentalDir);
      summary.directories.push("experimental/");
    }

    if (existsSync(experimentalTest)) {
      summary.totalSize += getDirectorySize(experimentalTest);
      summary.files.push(
        "components/providers/__tests__/provider-refactor.test.tsx",
      );
    }

    console.log("🧹 Starting experimental code cleanup...\n");

    // Remove experimental directory
    if (existsSync(experimentalDir)) {
      console.log("📁 Removing experimental directory...");
      rmSync(experimentalDir, { recursive: true, force: true });
      console.log("✅ Removed experimental/ directory");
    } else {
      console.log("ℹ️  Experimental directory not found");
    }

    // Remove experimental test file
    if (existsSync(experimentalTest)) {
      console.log("🧪 Removing experimental test file...");
      rmSync(experimentalTest, { force: true });
      console.log("✅ Removed provider-refactor.test.tsx");
    } else {
      console.log("ℹ️  Experimental test file not found");
    }

    // Verify cleanup
    const stillExists =
      existsSync(experimentalDir) || existsSync(experimentalTest);

    if (!stillExists) {
      summary.success = true;
      console.log("\n🎉 Cleanup completed successfully!");
      console.log(`📊 Total space freed: ${formatBytes(summary.totalSize)}`);
      console.log(`🗂️  Directories removed: ${summary.directories.length}`);
      console.log(`📄 Files removed: ${summary.files.length}`);
    } else {
      summary.errors.push("Some files still exist after cleanup");
    }
  } catch (error) {
    summary.errors.push(`Cleanup failed: ${error}`);
    console.error("❌ Cleanup failed:", error);
  }

  return summary;
}

async function updateGitignore() {
  try {
    console.log("\n📝 Checking .gitignore...");

    // Check if we need to update .gitignore to remove experimental references
    const { stdout } = await execAsync(
      'grep -n "experimental" .gitignore || true',
    );

    if (stdout.trim()) {
      console.log("ℹ️  Found experimental references in .gitignore");
      console.log("💡 Consider reviewing .gitignore for experimental patterns");
    } else {
      console.log("✅ No experimental references found in .gitignore");
    }
  } catch (_error) {
    console.warn("Warning: Could not check .gitignore");
  }
}

async function runLintCheck() {
  try {
    console.log("\n🔍 Running post-cleanup lint check...");

    // Run biome check to see improvement
    const { stdout } = await execAsync("biome check --reporter=summary", {
      encoding: "utf8",
      timeout: 30000,
    });

    console.log("📊 Post-cleanup lint results:");
    console.log(stdout);
  } catch (_error) {
    console.log("ℹ️  Lint check completed (warnings may remain)");
  }
}

// Main execution
async function main() {
  console.log("🚀 VetMed Tracker Experimental Code Cleanup\n");
  console.log("This script removes experimental architecture code in favor of");
  console.log(
    "the proven simplified approach that achieved 62% complexity reduction.\n",
  );

  // Perform cleanup
  const summary = await cleanupExperimental();

  // Update gitignore if needed
  await updateGitignore();

  // Check lint improvements
  await runLintCheck();

  // Summary report
  console.log("\n📋 Cleanup Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Status: ${summary.success ? "✅ Success" : "❌ Failed"}`);
  console.log(`Space Freed: ${formatBytes(summary.totalSize)}`);
  console.log(`Directories: ${summary.directories.join(", ") || "None"}`);
  console.log(`Files: ${summary.files.join(", ") || "None"}`);

  if (summary.errors.length > 0) {
    console.log(`Errors: ${summary.errors.join(", ")}`);
  }

  console.log("\n💡 Next Steps:");
  console.log("• Review docs/EXPERIMENTAL_LEARNINGS.md for insights");
  console.log("• Run `pnpm typecheck` to verify no broken imports");
  console.log("• Run `pnpm build` to ensure clean production build");
  console.log(
    '• Commit changes: "feat: remove experimental code in favor of simplified architecture"',
  );

  process.exit(summary.success ? 0 : 1);
}

// Handle errors gracefully
main().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
