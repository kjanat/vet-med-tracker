import { expect, RecordPage, test, testData } from "./fixtures";

test.describe("Record Administration E2E", () => {
	test.beforeEach(async ({ authenticatedPage }) => {
		// Navigate to record page
		await authenticatedPage.goto("/admin/record");
		await authenticatedPage.waitForLoadState("networkidle");
	});

	test("should complete full administration recording flow", async ({
		authenticatedPage,
	}) => {
		const recordPage = new RecordPage(authenticatedPage);

		// Select animal
		await recordPage.selectAnimal(testData.animal.name);

		// Verify animal is selected
		await expect(
			authenticatedPage.locator('[data-testid="selected-animal"]'),
		).toContainText(testData.animal.name);

		// Select regimen
		await recordPage.selectRegimen(testData.medication.name);

		// Verify regimen details are shown
		await expect(
			authenticatedPage.locator('[data-testid="regimen-details"]'),
		).toContainText(testData.medication.dosage);
		await expect(
			authenticatedPage.locator('[data-testid="regimen-details"]'),
		).toContainText(testData.medication.frequency);

		// Hold to confirm
		await recordPage.holdToConfirm();

		// Wait for success message
		await recordPage.waitForSuccess();

		// Verify success message contains timestamp and caregiver name
		const successMessage = authenticatedPage.locator(
			'[data-testid="success-message"]',
		);
		await expect(successMessage).toContainText("Recorded at");
		await expect(successMessage).toContainText(testData.user.name);
	});

	test("should prevent duplicate administrations", async ({
		authenticatedPage,
	}) => {
		const recordPage = new RecordPage(authenticatedPage);

		// First administration
		await recordPage.selectAnimal(testData.animal.name);
		await recordPage.selectRegimen(testData.medication.name);
		await recordPage.holdToConfirm();
		await recordPage.waitForSuccess();

		// Try to record same administration again
		await recordPage.holdToConfirm();

		// Should show warning about duplicate
		await expect(
			authenticatedPage.locator('[data-testid="duplicate-warning"]'),
		).toBeVisible();
		await expect(
			authenticatedPage.locator('[data-testid="duplicate-warning"]'),
		).toContainText("already recorded");
	});

	test("should show inventory selection when available", async ({
		authenticatedPage,
	}) => {
		const recordPage = new RecordPage(authenticatedPage);

		// Mock inventory items
		await authenticatedPage.route(
			"**/api/trpc/inventory.getHouseholdInventory*",
			(route) => {
				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						result: {
							data: [
								{
									id: "inv-1",
									medicationId: "med-amoxicillin",
									medicationName: "Amoxicillin",
									quantity: 20,
									unit: "tablets",
									expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
									isInUse: true,
									assignedToAnimalId: testData.animal.id,
								},
							],
						},
					}),
				});
			},
		);

		await recordPage.selectAnimal(testData.animal.name);
		await recordPage.selectRegimen("Amoxicillin");

		// Should show inventory selector
		await expect(
			authenticatedPage.locator('[data-testid="inventory-selector"]'),
		).toBeVisible();

		// Select inventory item
		await authenticatedPage.click('[data-testid="inventory-option-inv-1"]');

		// Should show quantity remaining
		await expect(
			authenticatedPage.locator('[data-testid="inventory-quantity"]'),
		).toContainText("20 tablets");
	});

	test("should handle offline recording", async ({
		authenticatedPage,
		context,
	}) => {
		const recordPage = new RecordPage(authenticatedPage);

		// Select animal and regimen while online
		await recordPage.selectAnimal(testData.animal.name);
		await recordPage.selectRegimen(testData.medication.name);

		// Go offline
		await context.setOffline(true);

		// Should show offline indicator
		await expect(
			authenticatedPage.locator('[data-testid="offline-indicator"]'),
		).toBeVisible();

		// Should still allow recording
		await recordPage.holdToConfirm();

		// Should show queued message instead of success
		await expect(
			authenticatedPage.locator('[data-testid="queued-message"]'),
		).toBeVisible();
		await expect(
			authenticatedPage.locator('[data-testid="queued-message"]'),
		).toContainText("saved offline");

		// Go back online
		await context.setOffline(false);

		// Should sync automatically
		await authenticatedPage.waitForSelector('[data-testid="sync-complete"]', {
			timeout: 10000,
		});
	});

	test("should show late warning for overdue medications", async ({
		authenticatedPage,
	}) => {
		const recordPage = new RecordPage(authenticatedPage);

		// Mock a late regimen
		await authenticatedPage.route(
			"**/api/trpc/regimens.getAnimalRegimens*",
			(route) => {
				const scheduledTime = new Date();
				scheduledTime.setHours(scheduledTime.getHours() - 2); // 2 hours ago

				route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						result: {
							data: [
								{
									id: "regimen-late",
									medicationName: "Amoxicillin",
									dosage: "250mg",
									frequency: "BID",
									nextDue: scheduledTime.toISOString(),
									isLate: true,
									minutesLate: 120,
								},
							],
						},
					}),
				});
			},
		);

		await recordPage.selectAnimal(testData.animal.name);

		// Should show late warning
		await expect(
			authenticatedPage.locator('[data-testid="late-warning"]'),
		).toBeVisible();
		await expect(
			authenticatedPage.locator('[data-testid="late-warning"]'),
		).toContainText("2 hours late");

		await recordPage.selectRegimen("Amoxicillin");
		await recordPage.holdToConfirm();

		// Administration should be marked as LATE
		await expect(
			authenticatedPage.locator('[data-testid="administration-status"]'),
		).toContainText("LATE");
	});

	test("should require co-sign for high-risk medications", async ({
		authenticatedPage,
	}) => {
		const recordPage = new RecordPage(authenticatedPage);

		// Mock high-risk medication
		await authenticatedPage.route("**/api/trpc/medications.get*", (route) => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					result: {
						data: {
							id: "med-insulin",
							name: "Insulin",
							isHighRisk: true,
							requiresCoSign: true,
						},
					},
				}),
			});
		});

		await recordPage.selectAnimal(testData.animal.name);
		await recordPage.selectRegimen("Insulin");

		// Should show high-risk warning
		await expect(
			authenticatedPage.locator('[data-testid="high-risk-warning"]'),
		).toBeVisible();
		await expect(
			authenticatedPage.locator('[data-testid="high-risk-warning"]'),
		).toContainText("requires verification");

		await recordPage.holdToConfirm();

		// Should show co-sign required modal
		await expect(
			authenticatedPage.locator('[data-testid="cosign-modal"]'),
		).toBeVisible();
		await expect(
			authenticatedPage.locator('[data-testid="cosign-modal"]'),
		).toContainText("Second caregiver verification required");

		// Enter co-signer credentials
		await authenticatedPage.fill('[data-testid="cosigner-pin"]', "1234");
		await authenticatedPage.click('[data-testid="verify-cosign-button"]');

		// Should complete administration
		await recordPage.waitForSuccess();
		await expect(
			authenticatedPage.locator('[data-testid="cosigner-name"]'),
		).toBeVisible();
	});
});
