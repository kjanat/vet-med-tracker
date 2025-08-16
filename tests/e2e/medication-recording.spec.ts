import { expect, test } from "@playwright/test";

// E2E test for the core "three taps to record" flow
test.describe("Medication Recording Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto("/");

    // TODO: Add authentication when auth is set up
    // For now, we'll assume dev mode allows access
  });

  test("should record medication administration in three taps", async ({
    page,
  }) => {
    // Navigate to record page
    await page.goto("/admin/record");

    // Step 1: Select animal (should be pre-selected from context)
    // In a real scenario, this would be pre-filled
    const animalSelector = page.getByTestId("animal-selector");
    if (await animalSelector.isVisible()) {
      await animalSelector.click();
      await page.getByText("Buddy").click();
    }

    // Step 2: Select medication/regimen
    const medicationCard = page.getByTestId("medication-card").first();
    await expect(medicationCard).toBeVisible();
    await medicationCard.click();

    // Step 3: Hold to confirm (3 seconds)
    const confirmButton = page.getByTestId("hold-to-confirm");
    await expect(confirmButton).toBeVisible();

    // Hold the button for 3 seconds
    await confirmButton.hover();
    await page.mouse.down();
    await page.waitForTimeout(3000);
    await page.mouse.up();

    // Verify success
    const successMessage = page.getByText(/Recorded at/);
    await expect(successMessage).toBeVisible();

    // Verify it shows the caregiver name
    await expect(page.getByText(/by Test User/)).toBeVisible();
  });

  test("should prevent duplicate administrations", async ({ page }) => {
    await page.goto("/admin/record");

    // Record first administration
    const medicationCard = page.getByTestId("medication-card").first();
    await medicationCard.click();

    const confirmButton = page.getByTestId("hold-to-confirm");
    await confirmButton.hover();
    await page.mouse.down();
    await page.waitForTimeout(3000);
    await page.mouse.up();

    // Try to record again (should be prevented by idempotency)
    await medicationCard.click();
    await confirmButton.hover();
    await page.mouse.down();
    await page.waitForTimeout(3000);
    await page.mouse.up();

    // Should show "already recorded" or similar message
    await expect(page.getByText(/already recorded/i)).toBeVisible();
  });

  test("should work offline and sync when back online", async ({
    page,
    context,
  }) => {
    await page.goto("/admin/record");

    // Go offline
    await context.setOffline(true);

    // Record administration while offline
    const medicationCard = page.getByTestId("medication-card").first();
    await medicationCard.click();

    const confirmButton = page.getByTestId("hold-to-confirm");
    await confirmButton.hover();
    await page.mouse.down();
    await page.waitForTimeout(3000);
    await page.mouse.up();

    // Should show queued/offline indicator
    await expect(page.getByTestId("offline-indicator")).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Wait for sync
    await page.waitForTimeout(2000);

    // Verify sync completed
    await expect(page.getByTestId("sync-complete")).toBeVisible();
  });
});

test.describe("Medication History", () => {
  test("should display administration history", async ({ page }) => {
    await page.goto("/history");

    // Should show list of past administrations
    await expect(page.getByTestId("history-list")).toBeVisible();

    // Should show medication details
    await expect(page.getByText(/Amoxicillin/)).toBeVisible();

    // Should show timestamps
    await expect(page.getByText(/Today at/)).toBeVisible();
  });

  test("should filter history by animal", async ({ page }) => {
    await page.goto("/history");

    // Select animal filter
    const animalFilter = page.getByTestId("animal-filter");
    await animalFilter.click();
    await page.getByText("Buddy").click();

    // Should only show Buddy's medications
    const historyItems = page.getByTestId("history-item");
    const count = await historyItems.count();

    for (let i = 0; i < count; i++) {
      await expect(historyItems.nth(i)).toContainText("Buddy");
    }
  });
});
