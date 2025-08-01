import { expect, test } from "@playwright/test";

// Tests for critical user journeys
test.describe("Critical User Paths", () => {
	test("should complete full medication administration flow", async ({
		page,
	}) => {
		// 1. Check what's due
		await page.goto("/");

		// Should see medications due
		const dueCard = page.getByTestId("medication-due").first();
		await expect(dueCard).toBeVisible();
		await expect(dueCard).toContainText(/due in/i);

		// 2. Navigate to record
		await dueCard.click();

		// Should be on record page with pre-selected medication
		await expect(page).toHaveURL(/\/admin\/record/);
		await expect(page.getByTestId("selected-medication")).toBeVisible();

		// 3. Confirm administration
		const confirmButton = page.getByTestId("hold-to-confirm");
		await confirmButton.hover();
		await page.mouse.down();
		await page.waitForTimeout(3000);
		await page.mouse.up();

		// 4. Verify success and return home
		await expect(page.getByText(/Recorded at/)).toBeVisible();
		await page.getByRole("button", { name: "Done" }).click();

		// 5. Verify medication no longer shows as due
		await expect(page).toHaveURL("/");
		await expect(dueCard).not.toBeVisible();
	});

	test("should handle high-risk medication with co-sign", async ({
		page,
		browser,
	}) => {
		await page.goto("/admin/record");

		// Select high-risk medication
		const highRiskMed = page.getByTestId("high-risk-medication").first();
		await expect(highRiskMed).toHaveAttribute("data-high-risk", "true");
		await highRiskMed.click();

		// First caregiver records
		const confirmButton = page.getByTestId("hold-to-confirm");
		await confirmButton.hover();
		await page.mouse.down();
		await page.waitForTimeout(3000);
		await page.mouse.up();

		// Should show co-sign required
		await expect(page.getByText(/Co-signature required/i)).toBeVisible();
		await expect(page.getByTestId("co-sign-timer")).toBeVisible();

		// Second caregiver signs in (simulate with new context)
		const context2 = await browser.newContext();
		const page2 = await context2.newPage();
		await page2.goto("/admin/record");

		// Should see pending co-sign
		await expect(page2.getByTestId("pending-co-sign")).toBeVisible();
		await page2.getByRole("button", { name: "Co-sign" }).click();

		// Verify both signatures recorded
		await expect(page2.getByText(/Co-signed by/)).toBeVisible();

		await context2.close();
	});

	test("should handle timezone correctly", async ({ page }) => {
		// Set up animal in different timezone
		await page.goto("/animals");
		await page.getByTestId("animal-settings").first().click();

		// Change timezone
		await page.getByLabel("Timezone").click();
		await page.getByText("America/Los_Angeles").click();
		await page.getByRole("button", { name: "Save" }).click();

		// Go to medications
		await page.goto("/");

		// Times should display in animal's timezone
		const medicationTime = page.getByTestId("scheduled-time").first();
		await expect(medicationTime).toContainText(/PST|PDT/);
	});

	test("should generate compliance report", async ({ page }) => {
		await page.goto("/insights");

		// Select date range
		await page.getByTestId("date-range").click();
		await page.getByText("Last 7 days").click();

		// Should show compliance percentage
		const complianceCard = page.getByTestId("compliance-score");
		await expect(complianceCard).toBeVisible();
		await expect(complianceCard).toContainText(/%/);

		// Should show on-time vs late breakdown
		await expect(page.getByTestId("on-time-count")).toBeVisible();
		await expect(page.getByTestId("late-count")).toBeVisible();
		await expect(page.getByTestId("missed-count")).toBeVisible();
	});
});
