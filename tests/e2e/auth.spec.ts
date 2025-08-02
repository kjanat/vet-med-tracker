import { test, expect } from "@playwright/test";
import { ClerkTestHelpers, TEST_USERS } from "../helpers/clerk-test-utils";

test.describe("Authentication Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto("/");
  });

  test("should sign in with test credentials", async ({ page }) => {
    // Navigate to sign-in
    await page.click('text="Sign In"');
    
    // Use Clerk test credentials
    await ClerkTestHelpers.signInWithTestUser(page, TEST_USERS.OWNER);
    
    // Should be redirected to dashboard or onboarding
    await expect(page).toHaveURL(/\/(dashboard|onboarding)/);
  });

  test("should complete onboarding flow", async ({ page }) => {
    // Sign in first
    await page.goto("/sign-in");
    await ClerkTestHelpers.signInWithTestUser(page, TEST_USERS.OWNER);
    
    // If redirected to onboarding, complete it
    if (page.url().includes("/onboarding")) {
      // Fill household name
      await page.fill('input[name="householdName"]', "Test Household");
      await page.click('button[type="submit"]');
      
      // Complete other onboarding steps...
      await expect(page).toHaveURL(/\/dashboard/);
    }
  });

  test("should handle different user roles", async ({ page }) => {
    // Test CAREGIVER role
    await page.goto("/sign-in");
    await ClerkTestHelpers.signInWithTestUser(page, TEST_USERS.CAREGIVER);
    
    // Verify role-specific permissions
    await expect(page.locator('[data-role="caregiver"]')).toBeVisible();
  });

  test("should sign out successfully", async ({ page }) => {
    // Sign in first
    await page.goto("/sign-in");
    await ClerkTestHelpers.signInWithTestUser(page, TEST_USERS.OWNER);
    
    // Sign out
    await ClerkTestHelpers.signOut(page);
    
    // Should be redirected to home or sign-in
    await expect(page).toHaveURL(/\/(sign-in|$)/);
  });
});