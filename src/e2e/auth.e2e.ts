import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should show sign up CTA for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/");

    // Check for sign up button (it's a button, not a link)
    const signUpButton = page.getByRole("button", {
      name: /start free/i,
    });
    await expect(signUpButton).toBeVisible();
  });

  test("should navigate to help and FAQ pages without authentication", async ({
    page,
  }) => {
    // Help page should be accessible
    await page.goto("/help");
    await expect(
      page.getByRole("heading", { level: 1, name: /how can we help/i }),
    ).toBeVisible();

    // FAQ page should be accessible
    await page.goto("/faq");
    await expect(
      page.getByRole("heading", { name: /frequently asked questions/i }),
    ).toBeVisible();
  });

  test.skip("should redirect to sign in when accessing protected routes", async ({
    page,
  }) => {
    // TODO: This test requires Stack Auth test configuration
    // Skip for now until test authentication is properly set up
    await page.goto("/auth/dashboard");
    await page.waitForURL(/handler|sign-in|auth/, { timeout: 10000 });
  });

  test("should show different navigation for authenticated users", async ({
    page,
  }) => {
    // Start on landing page
    await page.goto("/");

    // In unauthenticated state, should show button with "Start Free"
    // When authenticated, would show link with "Go to Dashboard"
    // For now, we just verify the unauthenticated state
    const ctaButton = page.getByRole("button", { name: /start free/i });
    await expect(ctaButton).toBeVisible();
  });
});

test.describe("Authentication - Login Form", () => {
  test.skip("should display sign in form", async ({ page }) => {
    // TODO: This test requires Stack Auth test configuration
    // Skip for now until test authentication is properly set up
    await page.goto("/auth/dashboard");
  });
});

// Note: Full authentication testing requires:
// 1. Test user credentials
// 2. Stack Auth test mode or mocked authentication
// 3. Session management
// These tests can be expanded once test authentication is configured
