/**
 * Initialize Notification Scheduler
 * This module handles starting the notification scheduler when the app starts
 */

import { db } from "@/db/drizzle";
import { getNotificationScheduler } from "./notification-scheduler";

let isInitialized = false;

/**
 * Initialize the notification scheduler
 * This should be called once when the application starts
 */
export function initializeNotificationScheduler(): void {
  if (isInitialized) {
    console.log("Notification scheduler already initialized");
    return;
  }

  // Only initialize in production or when explicitly enabled
  const shouldStart =
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_NOTIFICATION_SCHEDULER === "true";

  if (!shouldStart) {
    console.log("Notification scheduler disabled in development environment");
    return;
  }

  try {
    const scheduler = getNotificationScheduler(db);
    scheduler.start();
    isInitialized = true;
    console.log("Notification scheduler initialized successfully");

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("Received SIGINT, shutting down notification scheduler...");
      scheduler.stop();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("Received SIGTERM, shutting down notification scheduler...");
      scheduler.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to initialize notification scheduler:", error);
  }
}

/**
 * Get initialization status
 */
export function isSchedulerInitialized(): boolean {
  return isInitialized;
}
