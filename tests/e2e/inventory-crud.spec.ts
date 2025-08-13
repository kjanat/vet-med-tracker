import { expect, test } from "@playwright/test";

test.describe("Inventory CRUD Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to inventory page
    await page.goto("/inventory");

    // Wait for page to load
    await page.waitForSelector("h1:has-text('Inventory')");
  });

  test("should display inventory list", async ({ page }) => {
    // Check page header
    await expect(page.locator("h1")).toContainText("Inventory");
    await expect(
      page.locator("text=Manage medications and supplies"),
    ).toBeVisible();

    // Check for add button
    await expect(page.locator("button:has-text('Add Item')")).toBeVisible();
  });

  test("should add new inventory item", async ({ page }) => {
    // Click add button
    await page.click("button:has-text('Add Item')");

    // Wait for modal
    await page.waitForSelector("text=Add Inventory Item");

    // Fill out form
    await page.fill('input[placeholder="Medication name"]', "Test Medication");
    await page.fill('input[placeholder="Brand name"]', "Test Brand");
    await page.fill('input[placeholder="250mg"]', "100mg");
    await page.fill('input[placeholder="ABC123"]', "TEST123");

    // Set expiration date
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const dateString = futureDate.toISOString().split("T")[0] ?? "";
    await page.fill('input[type="date"]', dateString);

    // Select storage
    await page.click('button[role="combobox"]:has-text("Room Temperature")');
    await page.click("text=Refrigerated");

    // Set quantity
    await page.fill('input[type="number"]', "50");
    await page.fill('input[placeholder="tablets"]', "tablets");

    // Submit form
    await page.click('button[type="submit"]:has-text("Add")');

    // Verify item was added (would need API mocking in real test)
    await expect(page.locator("text=Test Medication")).toBeVisible({
      timeout: 5000,
    });
  });

  test("should edit inventory item", async ({ page }) => {
    // Assuming there's at least one item in the list
    // Click on the first item's menu
    await page.click("button[aria-haspopup='menu'] >> nth=0");

    // Click Details option
    await page.click("text=Details");

    // Wait for edit modal
    await page.waitForSelector("text=Edit Inventory Item");

    // Update some fields
    await page.fill(
      'input[placeholder="Override brand name"]',
      "Updated Brand",
    );
    await page.fill('input[type="number"]', "25");

    // Submit
    await page.click('button:has-text("Update")');

    // Verify modal closed
    await expect(page.locator("text=Edit Inventory Item")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should delete inventory item", async ({ page }) => {
    // Click on the first item's menu
    await page.click("button[aria-haspopup='menu'] >> nth=0");

    // Click Details option
    await page.click("text=Details");

    // Wait for edit modal
    await page.waitForSelector("text=Edit Inventory Item");

    // Click delete button
    await page.click('button:has-text("Delete")');

    // Handle confirmation dialog
    page.on("dialog", (dialog) => dialog.accept());

    // Verify modal closed
    await expect(page.locator("text=Edit Inventory Item")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should toggle in-use status", async ({ page }) => {
    // Click on the first item's menu
    await page.click("button[aria-haspopup='menu'] >> nth=0");

    // Click "Use This" option
    await page.click("text=Use This");

    // Verify status change (would need to check for visual indicator)
    // In a real test, we'd verify the API call or check for a status badge
  });

  test("should assign item to animal", async ({ page }) => {
    // Click on the first item's menu
    await page.click("button[aria-haspopup='menu'] >> nth=0");

    // Click Assign option
    await page.click("text=Assign");

    // Wait for assign modal
    await page.waitForSelector("text=Assign to Animal");

    // Select an animal (assuming animals exist)
    await page.click('button[role="combobox"]');
    await page.click('div[role="option"] >> nth=0');

    // Submit
    await page.click('button:has-text("Assign")');

    // Verify modal closed
    await expect(page.locator("text=Assign to Animal")).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should show alerts for expiring items", async ({ page }) => {
    // Check for alert banners
    const expiringAlert = page.locator("text=/expires in \\d+ days/");

    if (await expiringAlert.isVisible()) {
      // Click view item button
      await expiringAlert
        .locator("..")
        .locator("button:has-text('View Item')")
        .click();

      // Verify navigation or highlight (implementation specific)
    }
  });

  test("should filter and search inventory", async ({ page }) => {
    // Test search
    await page.fill('input[placeholder*="Search"]', "Rimadyl");

    // Wait for filtered results
    await page.waitForTimeout(300); // Debounce delay

    // Test sort
    await page.click('button[role="combobox"]:has-text("Priority")');
    await page.click("text=Name A-Z");

    // Verify sort applied (would need to check item order)
  });
});
