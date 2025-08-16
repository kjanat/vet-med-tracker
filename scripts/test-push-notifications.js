/**
 * Test script for push notification system
 * Tests key components without running the full application
 */

const {
  validateVAPIDConfig,
  getVAPIDConfig,
  getPublicVAPIDKey,
} = require("../lib/push-notifications/vapid-config.js");

async function testVAPIDConfiguration() {
  console.log("🔧 Testing VAPID Configuration...");

  try {
    // Test VAPID validation
    const isValid = validateVAPIDConfig();
    console.log(`✅ VAPID validation: ${isValid ? "PASSED" : "FAILED"}`);

    if (!isValid) {
      console.log("❌ VAPID keys are not properly configured");
      return false;
    }

    // Test VAPID config retrieval
    const config = getVAPIDConfig();
    console.log("✅ VAPID config retrieved successfully");
    console.log(`   Public Key: ${config.publicKey.substring(0, 20)}...`);
    console.log(`   Subject: ${config.subject}`);

    // Test public key retrieval
    const publicKey = getPublicVAPIDKey();
    console.log(`✅ Public VAPID key: ${publicKey.substring(0, 20)}...`);

    return true;
  } catch (error) {
    console.error("❌ VAPID configuration test failed:", error.message);
    return false;
  }
}

async function testSchedulerInitialization() {
  console.log("\n📅 Testing Notification Scheduler...");

  try {
    // Test scheduler configuration without starting it
    const {
      isSchedulerInitialized,
    } = require("../lib/push-notifications/init-scheduler.js");
    console.log(
      `✅ Scheduler initialization status: ${isSchedulerInitialized()}`,
    );

    // Test environment configuration
    const shouldStart =
      process.env.NODE_ENV === "production" ||
      process.env.ENABLE_NOTIFICATION_SCHEDULER === "true";
    console.log(`✅ Scheduler should start: ${shouldStart}`);
    console.log("   (Controlled by NODE_ENV or ENABLE_NOTIFICATION_SCHEDULER)");

    return true;
  } catch (error) {
    console.error("❌ Scheduler test failed:", error.message);
    return false;
  }
}

function testServiceWorkerConfig() {
  console.log("\n⚙️ Testing Service Worker Configuration...");

  try {
    const fs = require("node:fs");
    const path = require("node:path");

    // Check if service worker exists
    const swPath = path.join(process.cwd(), "public", "sw.js");
    const swExists = fs.existsSync(swPath);
    console.log(`✅ Service worker exists: ${swExists}`);

    if (swExists) {
      const swContent = fs.readFileSync(swPath, "utf8");
      const hasPushHandler = swContent.includes('addEventListener("push"');
      const hasNotificationShow = swContent.includes("showNotification");

      console.log(`✅ Push event handler: ${hasPushHandler}`);
      console.log(`✅ Notification display: ${hasNotificationShow}`);
    }

    return swExists;
  } catch (error) {
    console.error("❌ Service worker test failed:", error.message);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting Push Notification System Tests");
  console.log("==========================================\n");

  const results = [];

  // Run tests
  results.push(await testVAPIDConfiguration());
  results.push(await testSchedulerInitialization());
  results.push(testServiceWorkerConfig());

  // Summary
  console.log("\n📊 Test Results Summary");
  console.log("========================");

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`✅ Tests passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("🎉 All push notification system tests passed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Start the development server: pnpm dev");
    console.log("   2. Navigate to Settings > Notifications");
    console.log("   3. Test subscription and notifications");
    console.log("   4. Enable scheduler: ENABLE_NOTIFICATION_SCHEDULER=true");
  } else {
    console.log("⚠️  Some tests failed. Please check the configuration.");
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
