#!/usr/bin/env bun

/**
 * Performance Optimization Deployment Script
 * Wave 2B: Core Web Vitals Optimization
 *
 * Automates the deployment of performance optimization improvements
 * including database indexes, provider refactoring, and bundle optimization
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  dryRun: process.argv.includes("--dry-run"),
  forceOptimization: process.argv.includes("--force"),
  skipBundle: process.argv.includes("--skip-bundle"),
  skipDatabase: process.argv.includes("--skip-db"),
  skipProviders: process.argv.includes("--skip-providers"),
  verbose: process.argv.includes("--verbose"),
};

// =============================================================================
// UTILITIES
// =============================================================================

function log(
  message: string,
  level: "info" | "warn" | "error" | "success" = "info",
) {
  const colors = {
    error: "\x1b[31m", // Red
    info: "\x1b[36m", // Cyan
    success: "\x1b[32m", // Green
    warn: "\x1b[33m", // Yellow
  };
  const reset = "\x1b[0m";

  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[level]}[${timestamp}] ${message}${reset}`);
}

function execCommand(command: string, description: string): boolean {
  try {
    if (CONFIG.dryRun) {
      log(`[DRY RUN] Would execute: ${command}`, "info");
      return true;
    }

    log(`Executing: ${description}`, "info");
    if (CONFIG.verbose) {
      log(`Command: ${command}`, "info");
    }

    execSync(command, { stdio: CONFIG.verbose ? "inherit" : "pipe" });
    log(`✅ ${description} completed`, "success");
    return true;
  } catch (error) {
    log(`❌ ${description} failed: ${error}`, "error");
    return false;
  }
}

function backupFile(filePath: string): boolean {
  try {
    if (existsSync(filePath)) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      copyFileSync(filePath, backupPath);
      log(`📋 Backed up ${filePath} to ${backupPath}`, "info");
      return true;
    }
    return true;
  } catch (error) {
    log(`❌ Failed to backup ${filePath}: ${error}`, "error");
    return false;
  }
}

function replaceFile(source: string, target: string): boolean {
  try {
    if (CONFIG.dryRun) {
      log(`[DRY RUN] Would replace ${target} with ${source}`, "info");
      return true;
    }

    if (!backupFile(target)) {
      return false;
    }

    copyFileSync(source, target);
    log(`✅ Replaced ${target} with optimized version`, "success");
    return true;
  } catch (error) {
    log(`❌ Failed to replace ${target}: ${error}`, "error");
    return false;
  }
}

// =============================================================================
// DEPLOYMENT PHASES
// =============================================================================

async function phase1_DatabaseOptimization(): Promise<boolean> {
  log("🚀 Phase 1: Database Query Optimization", "info");

  if (CONFIG.skipDatabase) {
    log("⏭️ Skipping database optimization (--skip-db flag)", "warn");
    return true;
  }

  const steps = [
    {
      command: "bun run db:generate",
      description: "Generate database migration files",
    },
    {
      command: "bun run scripts/migrate.ts",
      description: "Apply performance optimization indexes",
    },
  ];

  let success = true;
  for (const step of steps) {
    if (!execCommand(step.command, step.description)) {
      success = false;
      break;
    }
  }

  if (success) {
    log("✅ Database optimization completed", "success");
  } else {
    log("❌ Database optimization failed", "error");
  }

  return success;
}

async function phase2_ProviderRefactoring(): Promise<boolean> {
  log("🔄 Phase 2: Provider Architecture Optimization", "info");

  if (CONFIG.skipProviders) {
    log("⏭️ Skipping provider optimization (--skip-providers flag)", "warn");
    return true;
  }

  const providerReplacements = [
    {
      source: "server/trpc/query-client-optimized.ts",
      target: "server/trpc/query-client.ts",
    },
  ];

  let success = true;
  for (const replacement of providerReplacements) {
    if (!replaceFile(replacement.source, replacement.target)) {
      success = false;
      break;
    }
  }

  if (success) {
    log("✅ Provider architecture optimization completed", "success");
  } else {
    log("❌ Provider architecture optimization failed", "error");
  }

  return success;
}

async function phase3_BundleOptimization(): Promise<boolean> {
  log("📦 Phase 3: Bundle and Build Optimization", "info");

  if (CONFIG.skipBundle) {
    log("⏭️ Skipping bundle optimization (--skip-bundle flag)", "warn");
    return true;
  }

  let success = true;
  // Install performance dependencies
  const installSteps = [
    {
      command: "bun add -D webpack-bundle-analyzer @next/bundle-analyzer",
      description: "Install bundle analysis tools",
    },
  ];

  for (const step of installSteps) {
    if (!execCommand(step.command, step.description)) {
      success = false;
      break;
    }
  }

  if (success) {
    log("✅ Bundle optimization completed", "success");
  } else {
    log("❌ Bundle optimization failed", "error");
  }

  return success;
}

async function phase4_ServiceWorkerSetup(): Promise<boolean> {
  log("⚙️ Phase 4: Performance Tooling Setup", "info");

  const packageJsonPath = "package.json";

  try {
    if (CONFIG.dryRun) {
      log("[DRY RUN] Would update package.json scripts", "info");
      return true;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    // Add performance analysis scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      analyze: "ANALYZE=true bun run build",
      "cache:clear": "rm -rf .next/cache",
      "perf:audit":
        "bun build && lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html",
      "perf:monitor": "bun add -D @vercel/analytics",
    };

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    log("✅ Updated package.json with performance scripts", "success");
    return true;
  } catch (error) {
    log(`❌ Failed to update package.json: ${error}`, "error");
    return false;
  }
}

async function phase5_PerformanceValidation(): Promise<boolean> {
  log("🎯 Phase 5: Performance Validation", "info");

  const validationSteps = [
    {
      command: "bun run typecheck",
      description: "TypeScript validation",
    },
    {
      command: "bun run lint",
      description: "Code quality validation",
    },
    {
      command: "bun run build",
      description: "Production build validation",
    },
  ];

  let success = true;
  for (const step of validationSteps) {
    if (!execCommand(step.command, step.description)) {
      success = false;
      if (!CONFIG.forceOptimization) {
        break;
      }
      log("⚠️ Continuing despite validation failure (--force flag)", "warn");
    }
  }

  if (success) {
    log("✅ Performance validation completed", "success");
  } else if (CONFIG.forceOptimization) {
    log("⚠️ Performance validation completed with warnings", "warn");
    success = true;
  } else {
    log("❌ Performance validation failed", "error");
  }

  return success;
}

// =============================================================================
// PERFORMANCE MEASUREMENT
// =============================================================================

function measureBundleSize(): void {
  try {
    const nextDir = ".next";
    if (!existsSync(nextDir)) {
      log("⚠️ Build not found, run 'bun run build' first", "warn");
      return;
    }

    // This would analyze the .next build output
    log("📊 Bundle Size Analysis:", "info");
    log("  - Initial bundle: Check .next/static/chunks/pages for size", "info");
    log("  - Run 'bun run analyze' for detailed bundle analysis", "info");
  } catch (error) {
    log(`❌ Bundle size analysis failed: ${error}`, "error");
  }
}

// =============================================================================
// MAIN DEPLOYMENT FUNCTION
// =============================================================================

async function deployPerformanceOptimizations(): Promise<void> {
  const startTime = performance.now();

  log("🚀 Starting Performance Optimization Deployment", "info");
  log(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`, "info");

  const phases = [
    { fn: phase1_DatabaseOptimization, name: "Database Optimization" },
    { fn: phase2_ProviderRefactoring, name: "Provider Refactoring" },
    { fn: phase3_BundleOptimization, name: "Bundle Optimization" },
    { fn: phase4_ServiceWorkerSetup, name: "Service Worker Setup" },
    { fn: phase5_PerformanceValidation, name: "Performance Validation" },
  ];

  let overallSuccess = true;
  const results: Array<{ name: string; success: boolean; duration: number }> =
    [];

  for (const phase of phases) {
    const phaseStartTime = performance.now();
    log(`\n${"=".repeat(60)}`, "info");
    log(`Starting ${phase.name}...`, "info");

    const success = await phase.fn();
    const duration = performance.now() - phaseStartTime;

    results.push({ duration, name: phase.name, success });

    if (!success) {
      overallSuccess = false;
      if (!CONFIG.forceOptimization) {
        log(`❌ Stopping deployment due to ${phase.name} failure`, "error");
        break;
      }
      log(`⚠️ Continuing despite ${phase.name} failure (--force flag)`, "warn");
    }
  }

  // Final summary
  const totalDuration = performance.now() - startTime;

  log(`\n${"=".repeat(60)}`, "info");
  log("📊 DEPLOYMENT SUMMARY", "info");
  log("=".repeat(60), "info");

  results.forEach((result) => {
    const status = result.success ? "✅ SUCCESS" : "❌ FAILED";
    const duration = (result.duration / 1000).toFixed(2);
    log(
      `${status} ${result.name} (${duration}s)`,
      result.success ? "success" : "error",
    );
  });

  log(`\nTotal Duration: ${(totalDuration / 1000).toFixed(2)}s`, "info");

  if (overallSuccess) {
    log(
      "\n🎉 Performance optimization deployment completed successfully!",
      "success",
    );
    log("\n📈 Next Steps:", "info");
    log("1. Monitor Core Web Vitals in production", "info");
    log("2. Run 'bun run perf:audit' for detailed analysis", "info");
    log("3. Check cache hit ratios in the performance dashboard", "info");
    log("4. Monitor database query performance", "info");

    measureBundleSize();
  } else {
    log("\n❌ Performance optimization deployment failed", "error");
    log("Review the errors above and re-run with --force if needed", "error");
    process.exit(1);
  }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

function showHelp(): void {
  console.log(`
Performance Optimization Deployment Script

Usage: bun run scripts/performance-optimization-deployment.ts [options]

Options:
  --dry-run         Show what would be done without executing
  --verbose         Show detailed command output
  --skip-db         Skip database optimization phase
  --skip-providers  Skip provider refactoring phase
  --skip-bundle     Skip bundle optimization phase
  --force           Continue deployment even if validation fails
  --help            Show this help message

Examples:
  bun run scripts/performance-optimization-deployment.ts
  bun run scripts/performance-optimization-deployment.ts --dry-run
  bun run scripts/performance-optimization-deployment.ts --skip-db --verbose
  bun run scripts/performance-optimization-deployment.ts --force
`);
}

// =============================================================================
// ENTRY POINT
// =============================================================================

if (process.argv.includes("--help")) {
  showHelp();
  process.exit(0);
}

// Run the deployment
deployPerformanceOptimizations().catch((error) => {
  log(`💥 Deployment crashed: ${error}`, "error");
  process.exit(1);
});

export { deployPerformanceOptimizations };
