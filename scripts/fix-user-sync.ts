#!/usr/bin/env bun

/**
 * Fix user sync issue between Stack Auth and local database
 *
 * This script handles various user synchronization issues:
 * - Users deleted from Stack Auth but still in local DB
 * - Orphaned test/seed users without Stack Auth IDs
 * - Cross-checking between vetmed_users and neon_auth.users_sync tables
 * - Validates stack_user_id against Stack Auth API
 *
 * Usage:
 *   bun scripts/fix-user-sync.ts <email>           # Fix specific user
 *   bun scripts/fix-user-sync.ts --check-orphaned  # List orphaned users
 *   bun scripts/fix-user-sync.ts --check-all       # Show all users and sync status
 *   bun scripts/fix-user-sync.ts --clean-test      # Remove test/seed users
 *   bun scripts/fix-user-sync.ts --validate-stack  # Validate Stack Auth IDs
 */

import { and, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "../db/drizzle";
import { vetmedUsers } from "../db/schema";

// ANSI color codes for better output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset}  ${msg}`),
  success: (msg: string) =>
    console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg: string) =>
    console.log(`${colors.yellow}⚠️${colors.reset}  ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: (msg: string) =>
    console.log(
      `\n${colors.bright}${colors.cyan}═══ ${msg} ═══${colors.reset}\n`,
    ),
};

// Test/seed user emails to identify
const TEST_USER_EMAILS = [
  "sarah.johnson@gmail.com",
  "michael.chen@outlook.com",
  "dr.emma.wilson@vetclinic.com",
  "james.martinez@gmail.com",
  "lisa.thompson@yahoo.com",
];

// Stack Auth API configuration
const STACK_API_URL = process.env.NEXT_PUBLIC_STACK_PROJECT_ID
  ? `https://api.stack-auth.com/api/v1/projects/${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`
  : null;
const STACK_SECRET_KEY = process.env.STACK_SECRET_SERVER_KEY;

/**
 * Validate if a Stack Auth user ID is actually valid
 */
async function validateStackUserId(stackUserId: string): Promise<{
  valid: boolean;
  user?: any;
  error?: string;
}> {
  if (!STACK_API_URL || !STACK_SECRET_KEY) {
    return {
      valid: false,
      error: "Stack Auth environment variables not configured",
    };
  }

  try {
    const response = await fetch(`${STACK_API_URL}/users/${stackUserId}`, {
      method: "GET",
      headers: {
        "x-stack-secret-server-key": STACK_SECRET_KEY,
        "x-stack-project-id": process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
        "x-stack-access-type": "server",
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      return {
        valid: false,
        error: "User not found in Stack Auth",
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        valid: false,
        error: `Stack Auth API error: ${response.status} - ${errorText}`,
      };
    }

    const userData = await response.json();
    return {
      valid: true,
      user: userData,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate: ${error}`,
    };
  }
}

async function checkAndFixUser(email: string) {
  log.header(`Checking user: ${email}`);

  try {
    // Find the user in the database
    const existingUser = await db
      .select()
      .from(vetmedUsers)
      .where(eq(vetmedUsers.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      log.success("No user found in database - you can sign up freely!");
      return;
    }

    const user = existingUser[0];
    console.log("📊 User details:");
    console.log(`  ID: ${colors.dim}${user.id}${colors.reset}`);
    console.log(`  Email: ${user.email}`);
    console.log(
      `  Name: ${user.name || `${colors.dim}(not set)${colors.reset}`}`,
    );
    console.log(
      `  Stack User ID: ${user.stackUserId || `${colors.yellow}(missing - orphaned)${colors.reset}`}`,
    );
    console.log(`  Created: ${colors.dim}${user.createdAt}${colors.reset}`);

    // Validate Stack Auth ID if present
    if (user.stackUserId) {
      const validation = await validateStackUserId(user.stackUserId);
      if (validation.valid) {
        console.log(
          `  Stack Auth Status: ${colors.green}✓ Valid${colors.reset} (${validation.user?.primaryEmail || validation.user?.email || "no email"})`,
        );
      } else {
        console.log(
          `  Stack Auth Status: ${colors.red}✗ Invalid${colors.reset} - ${validation.error}`,
        );
      }
    }

    console.log();

    // Check if we should delete the user
    const readline = require("node:readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `${colors.yellow}?${colors.reset} This user exists in the database${!user.stackUserId ? " but has no Stack Auth ID" : ""}.\n` +
          "  Would you like to delete it from the database? (yes/no): ",
        resolve,
      );
    });
    rl.close();

    if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "y") {
      console.log("\n🗑️  Deleting user from database...");

      await db.delete(vetmedUsers).where(eq(vetmedUsers.email, email));

      log.success("User deleted successfully!");
      console.log("  You can now sign up with this email address.\n");
    } else {
      log.info("User not deleted.");
    }
  } catch (error) {
    log.error(`Error: ${error}`);
    process.exit(1);
  }
}

async function checkOrphanedUsers() {
  log.header("Checking for Orphaned Users");

  const orphanedUsers = await db
    .select()
    .from(vetmedUsers)
    .where(
      or(isNull(vetmedUsers.stackUserId), eq(vetmedUsers.stackUserId, "")),
    );

  if (orphanedUsers.length === 0) {
    log.success("No orphaned users found!");
    return;
  }

  log.warning(`Found ${orphanedUsers.length} orphaned user(s):`);
  console.log();

  orphanedUsers.forEach((user) => {
    const isTestUser = TEST_USER_EMAILS.includes(user.email);
    console.log(`  ${colors.dim}•${colors.reset} ${user.email}`);
    console.log(`    ID: ${colors.dim}${user.id}${colors.reset}`);
    console.log(
      `    Type: ${isTestUser ? `${colors.yellow}Test/Seed User` : `${colors.cyan}Real User`}${colors.reset}`,
    );
    console.log(`    Created: ${colors.dim}${user.createdAt}${colors.reset}`);
    console.log();
  });

  log.info("These users don't have Stack Auth IDs and may cause sync issues.");
  console.log("Options:");
  console.log(
    "  • Run with email to fix individually: bun scripts/fix-user-sync.ts <email>",
  );
  console.log(
    "  • Clean all test users: bun scripts/fix-user-sync.ts --clean-test",
  );
}

async function checkAllUsers() {
  log.header("All Users in System");

  // Get all users from vetmed_users
  const allUsers = await db
    .select()
    .from(vetmedUsers)
    .orderBy(vetmedUsers.createdAt);

  // Check neon_auth.users_sync table
  const syncTableResult = await db.execute(
    sql`SELECT *
            FROM neon_auth.users_sync`,
  );
  const syncUsers = syncTableResult.rows;

  console.log(`${colors.bright}Local Database (vetmed_users):${colors.reset}`);
  console.log(`Total: ${allUsers.length} users\n`);

  allUsers.forEach((user) => {
    const isTestUser = TEST_USER_EMAILS.includes(user.email);
    const hasStackId = !!user.stackUserId;

    let status = "";
    if (isTestUser) status = `${colors.yellow} [TEST]${colors.reset}`;
    if (!hasStackId) status += `${colors.red} [ORPHANED]${colors.reset}`;
    if (hasStackId) status += `${colors.green} [SYNCED]${colors.reset}`;

    console.log(`  ${user.email}${status}`);
    if (!hasStackId) {
      console.log(`    ${colors.dim}Missing Stack Auth ID${colors.reset}`);
    } else {
      console.log(
        `    ${colors.dim}Stack ID: ${user.stackUserId}${colors.reset}`,
      );
    }
  });

  console.log(
    `\n${colors.bright}Stack Auth Sync Table (neon_auth.users_sync):${colors.reset}`,
  );
  console.log(`Total: ${syncUsers.length} users\n`);

  if (syncUsers.length === 0) {
    log.warning(
      "Sync table is empty - Stack Auth may not be properly configured",
    );
  } else {
    syncUsers.forEach((user: any) => {
      console.log(`  ${user.email || user.id}`);
      console.log(`    ${colors.dim}ID: ${user.id}${colors.reset}`);
      if (user.deleted_at) {
        console.log(
          `    ${colors.red}Deleted: ${user.deleted_at}${colors.reset}`,
        );
      }
    });
  }

  // Find mismatches
  console.log(`\n${colors.bright}Sync Issues:${colors.reset}`);

  const orphaned = allUsers.filter((u) => !u.stackUserId);
  const testUsers = allUsers.filter((u) => TEST_USER_EMAILS.includes(u.email));

  if (orphaned.length > 0) {
    log.warning(`${orphaned.length} users without Stack Auth ID`);
  }
  if (testUsers.length > 0) {
    log.info(`${testUsers.length} test/seed users found`);
  }
  if (orphaned.length === 0 && testUsers.length === 0) {
    log.success("No sync issues detected!");
  }
}

async function validateStackAuthIds() {
  log.header("Validating Stack Auth IDs");

  // Get all users with Stack Auth IDs
  const usersWithStackIds = await db
    .select()
    .from(vetmedUsers)
    .where(
      and(
        isNotNull(vetmedUsers.stackUserId),
        sql`${vetmedUsers.stackUserId}
                != ''`,
      ),
    );

  if (usersWithStackIds.length === 0) {
    log.info("No users with Stack Auth IDs found.");
    return;
  }

  console.log(
    `Checking ${usersWithStackIds.length} users with Stack Auth IDs...\n`,
  );

  let validCount = 0;
  let invalidCount = 0;
  const invalidUsers: any[] = [];

  for (const user of usersWithStackIds) {
    const validation = await validateStackUserId(user.stackUserId!);

    if (validation.valid) {
      validCount++;
      console.log(
        `  ${colors.green}✓${colors.reset} ${user.email} - Stack ID valid`,
      );
    } else {
      invalidCount++;
      invalidUsers.push({ user, error: validation.error });
      console.log(
        `  ${colors.red}✗${colors.reset} ${user.email} - ${validation.error}`,
      );
    }
  }

  console.log(`\n${colors.bright}Summary:${colors.reset}`);
  console.log(
    `  Valid Stack Auth IDs: ${colors.green}${validCount}${colors.reset}`,
  );
  console.log(
    `  Invalid Stack Auth IDs: ${colors.red}${invalidCount}${colors.reset}`,
  );

  if (invalidUsers.length > 0) {
    console.log(
      `\n${colors.yellow}Invalid users need attention:${colors.reset}`,
    );
    invalidUsers.forEach(({ user, error }) => {
      console.log(`  • ${user.email}`);
      console.log(
        `    ${colors.dim}Stack ID: ${user.stackUserId}${colors.reset}`,
      );
      console.log(`    ${colors.dim}Error: ${error}${colors.reset}`);
    });

    console.log(`\n${colors.cyan}Recommendations:${colors.reset}`);
    console.log("  1. These users may have been deleted from Stack Auth");
    console.log(
      "  2. Consider removing them with: bun scripts/fix-user-sync.ts <email>",
    );
    console.log("  3. Or clear their Stack IDs to mark them as orphaned");
  }
}

async function cleanTestUsers() {
  log.header("Cleaning Test/Seed Users");

  // Find all test/seed users (those in our TEST_USER_EMAILS list)
  const testUsersInList = await db
    .select()
    .from(vetmedUsers)
    .where(
      or(...TEST_USER_EMAILS.map((email) => eq(vetmedUsers.email, email))),
    );

  if (testUsersInList.length === 0) {
    log.info("No test users found to clean.");
    return;
  }

  console.log("Found test/seed users to remove:");
  testUsersInList.forEach((user) => {
    console.log(`  ${colors.dim}•${colors.reset} ${user.email}`);
  });

  const readline = require("node:readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question(
      `\n${colors.yellow}?${colors.reset} Delete ${testUsersInList.length} test user(s)? (yes/no): `,
      resolve,
    );
  });
  rl.close();

  if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "y") {
    await db
      .delete(vetmedUsers)
      .where(
        or(...TEST_USER_EMAILS.map((email) => eq(vetmedUsers.email, email))),
      );

    log.success(`Deleted ${testUsersInList.length} test user(s)!`);
  } else {
    log.info("Cleanup cancelled.");
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log(
    `${colors.bright}${colors.blue}╔════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.blue}║   VetMed User Sync Management      ║${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.blue}╚════════════════════════════════════╝${colors.reset}`,
  );

  try {
    switch (command) {
      case "--check-orphaned":
        await checkOrphanedUsers();
        break;

      case "--check-all":
      case "--status":
        await checkAllUsers();
        break;

      case "--clean-test":
        await cleanTestUsers();
        break;

      case "--validate-stack":
      case "--validate":
        await validateStackAuthIds();
        break;

      case "--help":
      case "-h":
      case undefined:
        console.log("\nUsage:");
        console.log(
          "  bun scripts/fix-user-sync.ts <email>           # Fix specific user",
        );
        console.log(
          "  bun scripts/fix-user-sync.ts --check-orphaned  # List orphaned users",
        );
        console.log(
          "  bun scripts/fix-user-sync.ts --check-all       # Show all users and sync status",
        );
        console.log(
          "  bun scripts/fix-user-sync.ts --clean-test      # Remove test/seed users",
        );
        console.log(
          "  bun scripts/fix-user-sync.ts --validate-stack  # Validate Stack Auth IDs",
        );
        console.log("\nExamples:");
        console.log("  bun scripts/fix-user-sync.ts user@example.com");
        console.log("  bun scripts/fix-user-sync.ts --check-orphaned");
        console.log("  bun scripts/fix-user-sync.ts --validate-stack");
        break;

      default:
        // Assume it's an email address
        if (command.includes("@")) {
          await checkAndFixUser(command);
        } else {
          log.error(`Unknown command: ${command}`);
          console.log("Run with --help to see available commands");
          process.exit(1);
        }
    }
  } catch (error) {
    log.error(`Fatal error: ${error}`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  log.error(`Fatal error: ${error}`);
  process.exit(1);
});
