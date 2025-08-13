import { expect, test } from "@playwright/test";
import StackAuthPlaywrightHelpers from "../helpers/stack-auth-playwright";
import { TEST_USERS } from "../mocks/stack-auth-playwright";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto("/");
  });

  test("should sign in with test credentials", async ({ page }) => {
    // Navigate to sign-in
    await page.click('text="Sign In"');

    // Use Stack Auth test credentials
    await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.OWNER);

    // Should be redirected to dashboard or onboarding
    await expect(page).toHaveURL(/\/(dashboard|onboarding|manage)/);
  });

  test("should complete onboarding flow", async ({ page }) => {
    // Sign in first
    await page.goto("/handler/sign-in");
    await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.OWNER);

    // If redirected to onboarding, complete it
    if (page.url().includes("/onboarding")) {
      // Fill household name
      await page.fill('input[name="householdName"]', "Test Household");
      await page.click('button[type="submit"]');

      // Complete other onboarding steps...
      await expect(page).toHaveURL(/\/(dashboard|manage)/);
    }
  });

  test("should handle different user roles", async ({ page }) => {
    // Test CAREGIVER role
    await page.goto("/handler/sign-in");
    await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.CAREGIVER);

    // Wait for navigation to dashboard or onboarding
    await expect(page).toHaveURL(/\/(dashboard|onboarding|manage)/);

    // Verify authentication was successful
    await StackAuthPlaywrightHelpers.expectAuthenticated(
      page,
      TEST_USERS.CAREGIVER,
    );
  });

  test("should sign out successfully", async ({ page }) => {
    // Sign in first
    await page.goto("/handler/sign-in");
    await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.OWNER);

    // Sign out
    await StackAuthPlaywrightHelpers.signOut(page);

    // Should be redirected to home or sign-in
    await expect(page).toHaveURL(/\/(handler\/sign-in|$)/);

    // Verify user is signed out
    await StackAuthPlaywrightHelpers.expectUnauthenticated(page);
  });

  test("should protect authenticated routes", async ({ page }) => {
    // Test that protected routes redirect to sign-in when not authenticated
    await StackAuthPlaywrightHelpers.testProtectedRoute(page, "/dashboard");
    await StackAuthPlaywrightHelpers.testProtectedRoute(page, "/manage");
    await StackAuthPlaywrightHelpers.testProtectedRoute(page, "/settings");
  });

  test("should allow access to authenticated routes when signed in", async ({
    page,
  }) => {
    // Test that authenticated users can access protected routes
    await StackAuthPlaywrightHelpers.testAuthenticatedRoute(
      page,
      "/manage",
      TEST_USERS.OWNER,
    );
  });
});
