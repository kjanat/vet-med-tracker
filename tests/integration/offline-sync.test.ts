import { expect, test } from "@playwright/test";
import {
	mockOfflineQueue,
	mockTRPCMutations,
	simulateOffline,
	simulateOnline,
} from "../helpers/offline-helpers";

test.describe("Offline Queue Sync Integration", () => {
	test.beforeEach(async ({ page }) => {
		// Set up mocks and navigate to the app
		await mockOfflineQueue(page);
		await mockTRPCMutations(page);
		await page.goto("/admin/record");
	});

	test("should queue administration when offline and sync when online", async ({
		page,
	}) => {
		// Step 1: Go offline
		await simulateOffline(page);

		// Step 2: Record an administration
		await page.getByTestId("animal-selector").click();
		await page.getByText("Buddy").click();

		await page.getByTestId("regimen-selector").click();
		await page.getByText("Amoxicillin 250mg").click();

		// Hold the record button
		const recordButton = page.getByTestId("record-button");
		await recordButton.press("Space");
		await page.waitForTimeout(3000); // Wait for 3-second hold
		await recordButton.press("Space"); // Release

		// Verify offline notification
		await expect(
			page.getByText("Saved offline - will sync when connected"),
		).toBeVisible();

		// Check sync status shows 1 pending
		const syncStatus = page.getByTestId("sync-status");
		await expect(syncStatus).toContainText("1");

		// Step 3: Go back online
		await simulateOnline(page);

		// Verify sync notification
		await expect(page.getByText("Back online - syncing changes")).toBeVisible();

		// Wait for sync to complete
		await expect(
			page.getByText("Successfully synced 1 offline change"),
		).toBeVisible();

		// Verify sync status cleared
		await expect(syncStatus).not.toContainText("1");
	});

	test("should handle multiple queued items", async ({ page }) => {
		// Go offline
		await simulateOffline(page);

		// Record multiple administrations
		for (let i = 0; i < 3; i++) {
			await page.getByTestId("animal-selector").click();
			await page.getByText("Buddy").click();

			await page.getByTestId("regimen-selector").click();
			await page.getByText("Amoxicillin 250mg").click();

			const recordButton = page.getByTestId("record-button");
			await recordButton.press("Space");
			await page.waitForTimeout(3000);
			await recordButton.press("Space");

			// Wait for success state to reset
			await page.waitForTimeout(1000);
		}

		// Verify 3 pending changes
		const syncStatus = page.getByTestId("sync-status");
		await expect(syncStatus).toContainText("3");

		// Click sync status to see details
		await syncStatus.click();

		// Verify queue details popup
		await expect(page.getByText("Offline Queue")).toBeVisible();
		await expect(page.getByText("Record administration")).toHaveCount(3);

		// Go online and verify batch sync
		await simulateOnline(page);

		await expect(
			page.getByText("Successfully synced 3 offline changes"),
		).toBeVisible();
	});

	test("should handle sync failures with retry", async ({ page }) => {
		// Set up to fail first sync attempt
		await page.evaluate(() => {
			let attemptCount = 0;
			(window as any).mockTRPCFailures = {
				"admin.create": () => {
					attemptCount++;
					return attemptCount === 1; // Fail first attempt only
				},
			};
		});

		// Go offline and record
		await simulateOffline(page);

		await page.getByTestId("animal-selector").click();
		await page.getByText("Buddy").click();

		await page.getByTestId("regimen-selector").click();
		await page.getByText("Amoxicillin 250mg").click();

		const recordButton = page.getByTestId("record-button");
		await recordButton.press("Space");
		await page.waitForTimeout(3000);
		await recordButton.press("Space");

		// Go online - first sync will fail
		await simulateOnline(page);

		// Wait for retry
		await page.waitForTimeout(2000);

		// Verify eventual success
		await expect(
			page.getByText("Successfully synced 1 offline change"),
		).toBeVisible();
	});

	test("should update inventory when syncing admin records", async ({
		page,
	}) => {
		// Navigate to inventory first to set up an item
		await page.goto("/inventory");

		// Note the initial quantity
		const inventoryItem = page.getByTestId("inventory-item-1");
		const initialQuantity = await inventoryItem
			.getByTestId("quantity")
			.textContent();

		// Go to admin record page
		await page.goto("/admin/record");

		// Go offline
		await simulateOffline(page);

		// Record with inventory source
		await page.getByTestId("animal-selector").click();
		await page.getByText("Buddy").click();

		await page.getByTestId("regimen-selector").click();
		await page.getByText("Amoxicillin 250mg").click();

		await page.getByTestId("inventory-source").click();
		await page.getByText("Amoxicillin 250mg - Bottle #1").click();

		const recordButton = page.getByTestId("record-button");
		await recordButton.press("Space");
		await page.waitForTimeout(3000);
		await recordButton.press("Space");

		// Go online and wait for sync
		await simulateOnline(page);
		await expect(
			page.getByText("Successfully synced 2 offline changes"),
		).toBeVisible();

		// Navigate back to inventory
		await page.goto("/inventory");

		// Verify quantity decreased
		const newQuantity = await inventoryItem
			.getByTestId("quantity")
			.textContent();
		expect(parseInt(newQuantity || "0")).toBeLessThan(
			parseInt(initialQuantity || "0"),
		);
	});

	test("should handle clearing offline queue", async ({ page }) => {
		// Go offline and queue some items
		await simulateOffline(page);

		// Record 2 administrations
		for (let i = 0; i < 2; i++) {
			await page.getByTestId("animal-selector").click();
			await page.getByText("Buddy").click();

			await page.getByTestId("regimen-selector").click();
			await page.getByText("Amoxicillin 250mg").click();

			const recordButton = page.getByTestId("record-button");
			await recordButton.press("Space");
			await page.waitForTimeout(3000);
			await recordButton.press("Space");

			await page.waitForTimeout(1000);
		}

		// Open sync status popup
		await page.getByTestId("sync-status").click();

		// Click clear queue
		await page.getByText("Clear Queue").click();

		// Handle confirmation dialog
		page.on("dialog", (dialog) => dialog.accept());

		// Verify queue cleared
		await expect(page.getByText("Offline queue cleared")).toBeVisible();
		await expect(page.getByText("No pending changes")).toBeVisible();
	});

	test("should preserve queue across page reloads", async ({ page }) => {
		// Go offline and record
		await simulateOffline(page);

		await page.getByTestId("animal-selector").click();
		await page.getByText("Buddy").click();

		await page.getByTestId("regimen-selector").click();
		await page.getByText("Amoxicillin 250mg").click();

		const recordButton = page.getByTestId("record-button");
		await recordButton.press("Space");
		await page.waitForTimeout(3000);
		await recordButton.press("Space");

		// Verify 1 pending
		await expect(page.getByTestId("sync-status")).toContainText("1");

		// Reload page
		await page.reload();

		// Verify queue persisted
		await expect(page.getByTestId("sync-status")).toContainText("1");

		// Go online and verify sync still works
		await simulateOnline(page);
		await expect(
			page.getByText("Successfully synced 1 offline change"),
		).toBeVisible();
	});

	test("should handle idempotency correctly", async ({ page }) => {
		// Set up to track API calls
		await page.evaluate(() => {
			(window as any).apiCallCount = {
				"admin.create": 0,
				"inventory.update": 0,
			};
		});

		// Go offline
		await simulateOffline(page);

		// Record the same administration twice with same idempotency key
		const recordAdmin = async () => {
			await page.getByTestId("animal-selector").click();
			await page.getByText("Buddy").click();

			await page.getByTestId("regimen-selector").click();
			await page.getByText("Amoxicillin 250mg").click();

			const recordButton = page.getByTestId("record-button");
			await recordButton.press("Space");
			await page.waitForTimeout(3000);
			await recordButton.press("Space");
		};

		await recordAdmin();
		await page.waitForTimeout(1000);

		// Try to record again (should use same idempotency key for same day/slot)
		await recordAdmin();

		// Go online
		await simulateOnline(page);

		// Wait for sync
		await expect(
			page.getByText(/Successfully synced \d+ offline change/),
		).toBeVisible();

		// Verify only one API call was made
		const callCounts = await page.evaluate(() => (window as any).apiCallCount);
		expect(callCounts["admin.create"]).toBe(1);
	});
});
