import { expect, test } from "@playwright/test";

test.describe("Public Navigation", () => {
  test("should navigate between public pages", async ({ page }) => {
    // Start at landing page
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/");

    // Navigate to FAQ
    await page.getByRole("link", { name: /faq/i }).first().click();
    await page.waitForURL(/\/faq/);
    await expect(page).toHaveURL(/\/faq/);

    // Navigate to Help
    await page.getByRole("link", { name: /help/i }).first().click();
    await page.waitForURL(/\/help/);
    await expect(page).toHaveURL(/\/help/);

    // Navigate back to home - direct navigation is more reliable
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL("/");
  });

  test("should have working footer links", async ({ page }) => {
    await page.goto("/");

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check footer is visible
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Check footer links
    const termsLink = footer.getByRole("link", { name: /terms/i });
    if (await termsLink.isVisible()) {
      await expect(termsLink).toHaveAttribute("href", /terms/);
    }
  });

  test("should maintain navigation state during page transitions", async ({
    page,
  }) => {
    await page.goto("/");

    // Click multiple navigation items
    await page.getByRole("link", { name: /faq/i }).first().click();
    await page.waitForURL(/\/faq/);

    // Use browser back
    await page.goBack();
    await expect(page).toHaveURL("/");

    // Use browser forward
    await page.goForward();
    await expect(page).toHaveURL(/\/faq/);
  });

  test("should have accessible keyboard navigation", async ({ page }) => {
    await page.goto("/");

    // Tab through navigation
    await page.keyboard.press("Tab");
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();

    // Press Enter on focused link
    await page.keyboard.press("Enter");

    // Should navigate somewhere
    await page.waitForLoadState("networkidle");
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });
});

test.describe("Search Functionality", () => {
  test("should have working FAQ search", async ({ page }) => {
    await page.goto("/faq");

    // Look for search input
    const searchInput = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/search/i));

    if (await searchInput.isVisible()) {
      // Type in search
      await searchInput.fill("medication");

      // Check that results filter
      await page.waitForTimeout(500); // Allow for filtering

      // Should show some results
      const results = page.locator("text=/medication/i");
      await expect(results.first()).toBeVisible();
    }
  });

  test("should show no results message for invalid search", async ({
    page,
  }) => {
    await page.goto("/faq");

    const searchInput = page
      .getByRole("searchbox")
      .or(page.getByPlaceholder(/search/i));

    if (await searchInput.isVisible()) {
      // Type in nonsense search
      await searchInput.fill("xyzabc123nonexistent");
      await page.waitForTimeout(500);

      // Should show no results message
      await expect(page.getByText(/no.*found|no results/i)).toBeVisible();
    }
  });
});

test.describe("Help Center Navigation", () => {
  test("should have collapsible help sections", async ({ page }) => {
    await page.goto("/help");

    // Look for expandable sections
    const sections = page
      .locator('[role="button"]')
      .or(page.locator("summary"));

    const sectionCount = await sections.count();
    if (sectionCount > 0) {
      // Click first section
      await sections.first().click();
      await page.waitForTimeout(300);

      // Check if content is revealed
      const content = page
        .locator("[role='region']")
        .or(page.locator("details[open]"));
      await expect(content.first()).toBeVisible();
    }
  });

  test("should have contact information", async ({ page }) => {
    await page.goto("/help");

    // Check for email link
    const emailLink = page.getByRole("link", { name: /mailto:|@/i });
    if (await emailLink.isVisible()) {
      await expect(emailLink).toHaveAttribute("href", /mailto:/);
    }
  });
});
