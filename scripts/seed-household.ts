#!/usr/bin/env tsx

// Quick script to seed a household for the current user
// Run with: pnpm tsx scripts/seed-household.ts

import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { households, memberships } from "@/db/schema";

// Load environment variables using Next.js env loader
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Use unpooled connection for seeding
if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("DATABASE_URL_UNPOOLED environment variable is not set");
}
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const db = drizzle(sql, { schema });

const USER_ID = "57513d54-6154-7c30-a38d-12deeed83320";

async function seedHousehold() {
  try {
    console.log("Checking for existing household membership...");

    // Check if user already has a household
    const existingMemberships = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, USER_ID));

    if (existingMemberships.length > 0) {
      console.log("User already has household memberships:");
      console.log(existingMemberships);
      return;
    }

    console.log("Creating new household...");

    // Create a new household
    const [newHousehold] = await db
      .insert(households)
      .values({
        name: "My Household",
      })
      .returning();

    if (!newHousehold) {
      throw new Error("Failed to create household");
    }

    console.log("Created household:", newHousehold);

    // Create membership
    const [newMembership] = await db
      .insert(memberships)
      .values({
        userId: USER_ID,
        householdId: newHousehold.id,
        role: "OWNER",
      })
      .returning();

    console.log("Created membership:", newMembership);
    console.log("\nSuccess! User now has a household.");
  } catch (error) {
    console.error("Error seeding household:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedHousehold();
