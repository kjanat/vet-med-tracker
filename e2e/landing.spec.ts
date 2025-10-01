import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should load the landing page successfully", async ({ page }) => {
    await page.goto("/");

    // Check that the page has the correct title
    await expect(page).toHaveTitle(/VetMed Tracker/);
  });

  test("should display main heading and CTA", async ({ page }) => {
    await page.goto("/");

    // Check for main heading
    await expect(
      page.getByRole("heading", { name: /never miss a dose/i }),
    ).toBeVisible();

    // Check for CTA button (it's a button, not a link)
    const ctaButton = page.getByRole("button", {
      name: /start free/i,
    });
    await expect(ctaButton).toBeVisible();
  });

  test("should navigate to FAQ page", async ({ page }) => {
    await page.goto("/");

    // Find and click FAQ link
    const faqLink = page.getByRole("link", { name: /faq/i });
    await faqLink.click();

    // Verify we're on the FAQ page
    await expect(page).toHaveURL(/\/faq/);
    await expect(
      page.getByRole("heading", { name: /frequently asked questions/i }),
    ).toBeVisible();
  });

  test("should navigate to Help page", async ({ page }) => {
    await page.goto("/");

    // Find and click Help link
    const helpLink = page.getByRole("link", { name: /help/i });
    await helpLink.click();

    // Verify we're on the Help page
    await expect(page).toHaveURL(/\/help/);
  });

  test("should have accessible navigation", async ({ page }) => {
    await page.goto("/");

    // Check that main navigation is accessible
    const nav = page.getByRole("navigation");
    await expect(nav).toBeVisible();

    // Check that links are keyboard accessible
    await page.keyboard.press("Tab");
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ height: 667, width: 375 });
    await page.goto("/");

    // Check that content is visible on mobile
    await expect(
      page.getByRole("heading", { name: /never miss a dose/i }),
    ).toBeVisible();

    // Check that mobile menu works (if applicable)
    const menuButton = page.getByRole("button", { name: /menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Wait for menu to expand
      await page.waitForTimeout(300);
    }
  });
});
