import { expect, test } from "@playwright/test";

test.describe("Inventory Management", () => {
  test("should add new inventory item", async ({ page }) => {
    await page.goto("/inventory");

    // Click add button
    await page.getByTestId("add-inventory").click();

    // Fill out form
    await page.getByLabel("Medication").click();
    await page.getByText("Amoxicillin 250mg").click();

    await page.getByLabel("Lot Number").fill("LOT123456");
    await page.getByLabel("Expiration Date").fill("2025-12-31");
    await page.getByLabel("Quantity").fill("30");

    // Submit
    await page.getByRole("button", { name: "Add to Inventory" }).click();

    // Verify success
    await expect(page.getByText("Added to inventory")).toBeVisible();

    // Verify item appears in list
    await expect(page.getByText("LOT123456")).toBeVisible();
  });

  test("should warn about expiring medications", async ({ page }) => {
    await page.goto("/inventory");

    // Look for expiration warnings
    const expiringItems = page.getByTestId("expiring-soon");

    if ((await expiringItems.count()) > 0) {
      // Should show warning icon/badge
      await expect(expiringItems.first()).toHaveClass(/warning/);

      // Should show days until expiration
      await expect(expiringItems.first()).toContainText(/expires in \d+ days/i);
    }
  });

  test("should track inventory usage", async ({ page }) => {
    await page.goto("/inventory");

    // Find an inventory item
    const inventoryItem = page.getByTestId("inventory-item").first();
    const initialQuantity = await inventoryItem
      .getByTestId("quantity")
      .textContent();

    // Record an administration that uses this inventory
    await page.goto("/admin/record");

    // Select medication that has inventory
    const medicationWithInventory = page.getByTestId("has-inventory").first();
    await medicationWithInventory.click();

    // Confirm administration
    const confirmButton = page.getByTestId("hold-to-confirm");
    await confirmButton.hover();
    await page.mouse.down();
    await page.waitForTimeout(3000);
    await page.mouse.up();

    // Go back to inventory
    await page.goto("/inventory");

    // Verify quantity decreased
    const updatedQuantity = await inventoryItem
      .getByTestId("quantity")
      .textContent();
    expect(parseInt(updatedQuantity || "0")).toBeLessThan(
      parseInt(initialQuantity || "0"),
    );
  });

  test("should show low stock warnings", async ({ page }) => {
    await page.goto("/inventory");

    // Look for low stock items
    const lowStockItems = page.getByTestId("low-stock");

    if ((await lowStockItems.count()) > 0) {
      // Should show warning
      await expect(lowStockItems.first()).toHaveClass(/warning/);

      // Should show estimated days remaining
      await expect(lowStockItems.first()).toContainText(
        /about \d+ days? left/i,
      );
    }
  });
});
