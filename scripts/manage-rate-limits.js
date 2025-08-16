#!/usr/bin/env node

/**
 * Rate Limit Management Script for VetMed Tracker
 *
 * Usage:
 *   node scripts/manage-rate-limits.js status    # Check rate limit status
 *   node scripts/manage-rate-limits.js clear     # Clear all rate limits
 *   node scripts/manage-rate-limits.js clear-ip <ip>  # Clear specific IP
 */

const https = require("node:https");

// Load from environment or use defaults
const API_URL =
  process.env.KV_REST_API_URL || "https://viable-bull-14611.upstash.io";
const API_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  "ATkTAAIjcDE3MDQwYTJhZWMzNzk0MzhmOTFiOGVmNzU0ZDUxZmQ0NHAxMA";

// Helper function to make Upstash API calls
async function upstashRequest(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      path: path,
      method: method,
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (_e) {
          resolve({ error: data });
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

// Check rate limit status
async function checkStatus() {
  console.log("🔍 Checking rate limit status...\n");

  const patterns = [
    "auth:signin:*",
    "auth:signup:*",
    "auth:reset:*",
    "api:general:*",
  ];

  let totalKeys = 0;

  for (const pattern of patterns) {
    const result = await upstashRequest(
      `/scan/0/match/${encodeURIComponent(pattern)}/count/100`,
    );

    if (result.result?.[1] && result.result[1].length > 0) {
      console.log(`📊 ${pattern.replace(":*", "")} limits:`);

      for (const key of result.result[1]) {
        // Skip event keys
        if (key.includes(":events:")) continue;

        const value = await upstashRequest(`/get/${encodeURIComponent(key)}`);
        const ip = key.split(":").pop();

        if (value.result) {
          console.log(`  • ${ip}: ${value.result}`);
          totalKeys++;
        }
      }
      console.log();
    }
  }

  if (totalKeys === 0) {
    console.log("✅ No active rate limits found!\n");
  } else {
    console.log(`Found ${totalKeys} active rate limits.\n`);
  }
}

// Clear all rate limits
async function clearAll() {
  console.log("🧹 Clearing all rate limits...\n");

  const patterns = [
    "auth:signin:*",
    "auth:signup:*",
    "auth:reset:*",
    "api:general:*",
  ];

  let clearedCount = 0;

  for (const pattern of patterns) {
    const result = await upstashRequest(
      `/scan/0/match/${encodeURIComponent(pattern)}/count/100`,
    );

    if (result.result?.[1] && result.result[1].length > 0) {
      for (const key of result.result[1]) {
        const delResult = await upstashRequest(
          `/del/${encodeURIComponent(key)}`,
        );
        if (delResult.result > 0) {
          console.log(`  ✓ Cleared: ${key}`);
          clearedCount++;
        }
      }
    }
  }

  if (clearedCount > 0) {
    console.log(`\n✅ Cleared ${clearedCount} rate limit entries!\n`);
  } else {
    console.log("✅ No rate limits to clear!\n");
  }
}

// Clear rate limit for specific IP
async function clearIP(ip) {
  console.log(`🧹 Clearing rate limits for IP: ${ip}\n`);

  const prefixes = [
    "auth:signin:",
    "auth:signup:",
    "auth:reset:",
    "api:general:",
  ];

  let clearedCount = 0;

  for (const prefix of prefixes) {
    const key = prefix + ip;
    const result = await upstashRequest(`/del/${encodeURIComponent(key)}`);

    if (result.result > 0) {
      console.log(`  ✓ Cleared: ${key}`);
      clearedCount++;
    }
  }

  if (clearedCount > 0) {
    console.log(`\n✅ Cleared ${clearedCount} rate limit entries for ${ip}!\n`);
  } else {
    console.log(`✅ No rate limits found for ${ip}\n`);
  }
}

// Main CLI handler
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  VetMed Tracker Rate Limiter");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    switch (command) {
      case "status":
        await checkStatus();
        break;

      case "clear":
        if (arg) {
          console.error("❌ Did you mean: clear-ip <ip>?\n");
          process.exit(1);
        }
        await clearAll();
        break;

      case "clear-ip":
        if (!arg) {
          console.error("❌ Please provide an IP address\n");
          console.log(
            "Usage: node scripts/manage-rate-limits.js clear-ip <ip>\n",
          );
          process.exit(1);
        }
        await clearIP(arg);
        break;

      default:
        console.log("Available commands:\n");
        console.log("  status          Check current rate limit status");
        console.log("  clear           Clear all rate limits");
        console.log("  clear-ip <ip>   Clear rate limits for specific IP\n");
        console.log("Examples:");
        console.log("  node scripts/manage-rate-limits.js status");
        console.log("  node scripts/manage-rate-limits.js clear");
        console.log(
          "  node scripts/manage-rate-limits.js clear-ip 127.0.0.1\n",
        );
        break;
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { checkStatus, clearAll, clearIP };
