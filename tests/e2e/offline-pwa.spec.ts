import { expect, test } from "@playwright/test";
import {
	getApiCallCounts,
	getQueueSize,
	mockOfflineQueue,
	mockTRPCMutations,
	resetApiCallCounts,
	simulateOffline,
	simulateOnline,
	waitForSync,
} from "../helpers/offline-helpers";
import {
	dismissToasts,
	login,
	mockDateTime,
	waitForReact,
	waitForToast,
} from "../helpers/test-utils";
import type { MockWindow } from "../helpers/types";

test.describe("PWA Offline Functionality", () => {
	test.beforeEach(async ({ page, context }) => {
		// Set up PWA context
		await context.grantPermissions(["notifications"]);

		// Mock current time for consistent testing
		await mockDateTime(page, new Date("2024-01-15T10:00:00Z"));

		// Set up offline queue and API mocks
		await mockOfflineQueue(page);
		await mockTRPCMutations(page);

		// Login and navigate
		await login(page);
		await waitForReact(page);
	});

	test("Complete offline workflow: record, sync, verify", async ({ page }) => {
		// Step 1: Navigate to admin record page
		await page.goto("/admin/record");

		// Verify we're online initially
		await expect(page.getByTestId("sync-status")).not.toContainText("1");

		// Step 2: Go offline
		await simulateOffline(page);

		// Verify offline indicator
		await expect(page.locator('[aria-label="Offline"]')).toBeVisible();

		// Step 3: Select animal and regimen
		await page.getByLabel("Select animal").click();
		await page.getByRole("option", { name: "Buddy" }).click();

		await page.getByLabel("Select regimen").click();
		await page.getByRole("option", { name: "Amoxicillin 250mg BID" }).click();

		// Select inventory source
		await page.getByLabel("Inventory source").click();
		await page
			.getByRole("option", { name: "Bottle #1 - Expires 2024-12-31" })
			.click();

		// Step 4: Hold to record
		const recordButton = page.getByRole("button", { name: "Hold to Record" });

		// Mouse down and hold
		await recordButton.hover();
		await page.mouse.down();

		// Wait for progress ring to complete (3 seconds)
		await page.waitForTimeout(3100);

		// Release
		await page.mouse.up();

		// Step 5: Verify offline save
		await waitForToast(page, "Saved offline - will sync when connected");

		// Verify sync badge shows 1 (or 2 if inventory update is separate)
		const syncBadge = page.getByTestId("sync-status").locator(".badge");
		await expect(syncBadge).toBeVisible();
		const badgeText = await syncBadge.textContent();
		expect(parseInt(badgeText || "0")).toBeGreaterThanOrEqual(1);

		// Step 6: Check queue details
		await page.getByTestId("sync-status").click();

		// Verify queue popup
		await expect(page.getByText("Offline Queue")).toBeVisible();
		await expect(page.getByText("Record administration")).toBeVisible();

		// Close popup
		await page.keyboard.press("Escape");

		// Step 7: Navigate away and back (test persistence)
		await page.goto("/");
		await page.goto("/admin/record");

		// Verify queue persisted
		await expect(
			page.getByTestId("sync-status").locator(".badge"),
		).toBeVisible();

		// Step 8: Go back online
		await simulateOnline(page);

		// Verify online indicator
		await waitForToast(page, "Back online - syncing changes");

		// Wait for sync to complete
		await waitForSync(page);

		// Verify success
		await page
			.getByRole("status")
			.filter({ hasText: /Successfully synced \d+ offline change/ })
			.waitFor();

		// Verify sync badge cleared
		await expect(
			page.getByTestId("sync-status").locator(".badge"),
		).not.toBeVisible();

		// Step 9: Verify API calls were made
		const apiCalls = await getApiCallCounts(page);
		expect(apiCalls["admin.create"]).toBe(1);
		expect(apiCalls["inventory.update"]).toBe(1);
	});

	test("Handle network interruption during sync", async ({ page }) => {
		// Start offline with queued items
		await simulateOffline(page);
		await page.goto("/admin/record");

		// Record an administration
		await page.getByLabel("Select animal").click();
		await page.getByRole("option", { name: "Buddy" }).click();

		await page.getByLabel("Select regimen").click();
		await page.getByRole("option", { name: "Amoxicillin 250mg BID" }).click();

		const recordButton = page.getByRole("button", { name: "Hold to Record" });
		await recordButton.hover();
		await page.mouse.down();
		await page.waitForTimeout(3100);
		await page.mouse.up();

		await dismissToasts(page);

		// Set up to fail sync
		await page.evaluate(() => {
			(window as any).mockTRPCFailures["admin.create"] = () => true;
		});

		// Go online to trigger sync
		await simulateOnline(page);

		// Wait for sync attempt
		await page.waitForTimeout(2000);

		// Verify item still in queue due to failure
		const queueSize = await getQueueSize(page);
		expect(queueSize).toBeGreaterThan(0);

		// Fix the mock to allow success
		await page.evaluate(() => {
			(window as any).mockTRPCFailures["admin.create"] = () => false;
		});

		// Manual retry
		await page.getByTestId("sync-status").click();
		await page.getByRole("button", { name: "Sync Now" }).click();

		// Verify eventual success
		await page
			.getByRole("status")
			.filter({ hasText: /Successfully synced \d+ offline change/ })
			.waitFor();
		await waitForSync(page);
	});

	test("Service worker caches app shell for offline use", async ({
		page,
		context,
	}) => {
		// Load the app online first
		await page.goto("/");
		await waitForReact(page);

		// Wait for service worker to install
		await page.waitForTimeout(2000);

		// Go offline
		await simulateOffline(page);
		await context.setOffline(true);

		// Navigate to different pages - should work offline
		await page.goto("/admin/record");
		await expect(page.getByText("Record Administration")).toBeVisible();

		await page.goto("/inventory");
		await expect(page.getByText("Inventory")).toBeVisible();

		await page.goto("/history");
		await expect(page.getByText("History")).toBeVisible();

		// Verify offline indicator is shown
		await expect(page.locator('[aria-label="Offline"]')).toBeVisible();
	});

	test("Queue multiple operations and sync in order", async ({ page }) => {
		await page.goto("/admin/record");
		await simulateOffline(page);

		// Reset counters
		await resetApiCallCounts(page);

		// Record 3 administrations
		for (let i = 0; i < 3; i++) {
			await page.getByLabel("Select animal").click();
			await page
				.getByRole("option", { name: i % 2 === 0 ? "Buddy" : "Whiskers" })
				.click();

			await page.getByLabel("Select regimen").click();
			await page.getByRole("option").first().click();

			const recordButton = page.getByRole("button", { name: "Hold to Record" });
			await recordButton.hover();
			await page.mouse.down();
			await page.waitForTimeout(3100);
			await page.mouse.up();

			// Wait for UI to reset
			await page.waitForTimeout(1000);
			await dismissToasts(page);
		}

		// Verify queue size
		const queueSize = await getQueueSize(page);
		expect(queueSize).toBeGreaterThanOrEqual(3);

		// Go online and sync
		await simulateOnline(page);
		await waitForSync(page);

		// Verify all were synced
		const apiCalls = await getApiCallCounts(page);
		expect(apiCalls["admin.create"]).toBe(3);
	});

	test("Offline indicator in sync status component", async ({ page }) => {
		await page.goto("/");

		// Online state
		const syncStatus = page.getByTestId("sync-status");
		await expect(syncStatus.locator('[aria-label="Online"]')).toBeVisible();

		// Hover for tooltip
		await syncStatus.hover();
		await expect(page.getByText("All changes synced")).toBeVisible();

		// Go offline
		await simulateOffline(page);

		// Offline state
		await expect(syncStatus.locator('[aria-label="Offline"]')).toBeVisible();

		// Hover for tooltip
		await syncStatus.hover();
		await expect(
			page.getByText("Offline - changes will sync when reconnected"),
		).toBeVisible();
	});

	test("Clear queue functionality", async ({ page }) => {
		await page.goto("/admin/record");
		await simulateOffline(page);

		// Add items to queue
		await page.getByLabel("Select animal").click();
		await page.getByRole("option", { name: "Buddy" }).click();

		await page.getByLabel("Select regimen").click();
		await page.getByRole("option").first().click();

		const recordButton = page.getByRole("button", { name: "Hold to Record" });
		await recordButton.hover();
		await page.mouse.down();
		await page.waitForTimeout(3100);
		await page.mouse.up();

		// Open queue details
		await page.getByTestId("sync-status").click();

		// Click clear queue
		page.on("dialog", (dialog) => {
			expect(dialog.message()).toContain("Are you sure you want to clear");
			dialog.accept();
		});

		await page.getByRole("button", { name: "Clear Queue" }).click();

		// Verify cleared
		await waitForToast(page, "Offline queue cleared");
		await expect(page.getByText("No pending changes")).toBeVisible();

		const queueSize = await getQueueSize(page);
		expect(queueSize).toBe(0);
	});
});
