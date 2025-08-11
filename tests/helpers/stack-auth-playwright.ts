/**
 * Stack Auth Playwright Helpers
 * E2E testing utilities for Stack Auth with Playwright
 */

import { expect, type Page } from "@playwright/test";
import { type MockStackUser, TEST_USERS } from "../mocks/stack-auth-playwright";

export class StackAuthPlaywrightHelpers {
	/**
	 * Mock Stack Auth for Playwright tests by intercepting API calls
	 */
	static async mockStackAuth(
		page: Page,
		user: MockStackUser | null = TEST_USERS.OWNER,
	) {
		// Intercept Stack Auth API calls and requests
		await page.route("**/api/stack-auth/**", async (route) => {
			const url = route.request().url();

			if (url.includes("/user") || url.includes("/me")) {
				await route.fulfill({
					status: user ? 200 : 401,
					contentType: "application/json",
					body: JSON.stringify(user ? { user } : { error: "Unauthorized" }),
				});
			} else if (url.includes("/session")) {
				const session = user
					? {
							user,
							accessToken: `mock_token_${user.id}`,
							expiresAt: Date.now() + 3600000,
						}
					: null;

				await route.fulfill({
					status: user ? 200 : 401,
					contentType: "application/json",
					body: JSON.stringify(
						session ? { session } : { error: "Unauthorized" },
					),
				});
			} else if (url.includes("/sign-out")) {
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({ success: true }),
				});
			} else {
				await route.continue();
			}
		});

		// Mock localStorage for client-side session management
		await page.addInitScript((userData) => {
			// Set up Stack Auth session in localStorage
			if (userData) {
				const sessionData = {
					user: userData,
					accessToken: `mock_token_${userData.id}`,
					refreshToken: `mock_refresh_${userData.id}`,
					expiresAt: Date.now() + 3600000,
				};
				localStorage.setItem("stack-auth-session", JSON.stringify(sessionData));
				localStorage.setItem("stack-auth-user", JSON.stringify(userData));
			} else {
				localStorage.removeItem("stack-auth-session");
				localStorage.removeItem("stack-auth-user");
			}

			// Mock the Stack Auth client-side detection
			window.__STACK_AUTH_MOCKED__ = true;
			window.__STACK_AUTH_USER__ = userData;
		}, user);

		// Mock Stack Auth handler routes
		await page.route("**/handler/sign-in/**", async (route) => {
			if (user && route.request().method() === "POST") {
				await route.fulfill({
					status: 302,
					headers: {
						Location: "/dashboard",
						"Set-Cookie": `stack-session=${user.id}; Path=/; HttpOnly`,
					},
				});
			} else {
				await route.continue();
			}
		});

		await page.route("**/handler/sign-up/**", async (route) => {
			if (user && route.request().method() === "POST") {
				await route.fulfill({
					status: 302,
					headers: {
						Location: "/onboarding",
						"Set-Cookie": `stack-session=${user.id}; Path=/; HttpOnly`,
					},
				});
			} else {
				await route.continue();
			}
		});

		await page.route("**/handler/sign-out/**", async (route) => {
			await route.fulfill({
				status: 302,
				headers: {
					Location: "/",
					"Set-Cookie": "stack-session=; Path=/; HttpOnly; Max-Age=0",
				},
			});
		});
	}

	/**
	 * Sign in a test user in Playwright
	 */
	static async signIn(page: Page, user: MockStackUser = TEST_USERS.OWNER) {
		await StackAuthPlaywrightHelpers.mockStackAuth(page, user);

		// Navigate to sign-in page
		await page.goto("/handler/sign-in");

		// Fill out sign-in form if it exists
		const emailInput = page
			.locator('input[name="email"], input[type="email"]')
			.first();
		const passwordInput = page
			.locator('input[name="password"], input[type="password"]')
			.first();
		const submitButton = page
			.locator('button[type="submit"], button:has-text("Sign In")')
			.first();

		if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
			await emailInput.fill(user.primaryEmail || "test@example.com");

			if (await passwordInput.isVisible({ timeout: 1000 }).catch(() => false)) {
				await passwordInput.fill("password123");
			}

			if (await submitButton.isVisible({ timeout: 1000 }).catch(() => false)) {
				await submitButton.click();
			}
		}

		// Simulate successful authentication via JavaScript
		await page.evaluate((userData) => {
			// Update localStorage
			const sessionData = {
				user: userData,
				accessToken: `mock_token_${userData.id}`,
				refreshToken: `mock_refresh_${userData.id}`,
				expiresAt: Date.now() + 3600000,
			};
			localStorage.setItem("stack-auth-session", JSON.stringify(sessionData));
			localStorage.setItem("stack-auth-user", JSON.stringify(userData));

			// Dispatch custom events to simulate Stack Auth state changes
			window.dispatchEvent(
				new CustomEvent("stack-auth-state-change", {
					detail: { user: userData, isSignedIn: true },
				}),
			);

			// Update global state
			window.__STACK_AUTH_USER__ = userData;
		}, user);

		// Wait for redirect to authenticated area
		await page
			.waitForURL(/\/(dashboard|profile|onboarding|manage)/, { timeout: 10000 })
			.catch(async () => {
				// If no redirect, try to navigate to dashboard
				await page.goto("/dashboard");
			});

		// Verify sign-in was successful
		await expect(page).not.toHaveURL(/\/(sign-in|sign-up|handler\/sign-in)/);
	}

	/**
	 * Sign out the current user in Playwright
	 */
	static async signOut(page: Page) {
		await StackAuthPlaywrightHelpers.mockStackAuth(page, null);

		// Try to find and click sign-out button
		const userMenuButton = page
			.locator('[data-testid="user-menu"], [aria-label*="user menu"]')
			.first();
		const signOutButton = page
			.locator('button:has-text("Sign out"), a:has-text("Sign out")')
			.first();

		// Try user menu first
		if (await userMenuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await userMenuButton.click();
			await page.waitForTimeout(500); // Wait for menu to open
		}

		// Click sign out if visible
		if (await signOutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
			await signOutButton.click();
		} else {
			// Navigate directly to sign-out handler
			await page.goto("/handler/sign-out");
		}

		// Clear localStorage
		await page.evaluate(() => {
			localStorage.removeItem("stack-auth-session");
			localStorage.removeItem("stack-auth-user");

			// Dispatch sign-out event
			window.dispatchEvent(
				new CustomEvent("stack-auth-state-change", {
					detail: { user: null, isSignedIn: false },
				}),
			);

			// Update global state
			window.__STACK_AUTH_USER__ = null;
		});

		// Wait for redirect to public page
		await page
			.waitForURL(/\/(sign-in|$)/, { timeout: 5000 })
			.catch(async () => {
				// If no redirect, navigate to home
				await page.goto("/");
			});

		// Verify sign-out was successful
		await expect(page).not.toHaveURL(/\/(dashboard|profile|manage)/);
	}

	/**
	 * Wait for authentication state to be ready
	 */
	static async waitForAuthReady(page: Page, timeout: number = 10000) {
		await page.waitForFunction(() => window.__STACK_AUTH_MOCKED__ === true, {
			timeout,
		});
	}

	/**
	 * Get current authenticated user from page context
	 */
	static async getCurrentUser(page: Page): Promise<MockStackUser | null> {
		return await page.evaluate(() => window.__STACK_AUTH_USER__ || null);
	}

	/**
	 * Verify user is authenticated
	 */
	static async expectAuthenticated(page: Page, user?: MockStackUser) {
		const currentUser = await StackAuthPlaywrightHelpers.getCurrentUser(page);
		expect(currentUser).toBeTruthy();

		if (user) {
			expect(currentUser?.id).toBe(user.id);
			expect(currentUser?.primaryEmail).toBe(user.primaryEmail);
		}

		// Should not be on sign-in/sign-up pages
		await expect(page).not.toHaveURL(
			/\/(sign-in|sign-up|handler\/sign-in|handler\/sign-up)/,
		);
	}

	/**
	 * Verify user is not authenticated
	 */
	static async expectUnauthenticated(page: Page) {
		const currentUser = await StackAuthPlaywrightHelpers.getCurrentUser(page);
		expect(currentUser).toBeNull();
	}

	/**
	 * Create test scenarios for common authentication flows
	 */
	static createAuthFlows(page: Page) {
		return {
			/**
			 * Test owner authentication flow
			 */
			asOwner: async () => {
				await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.OWNER);
				await StackAuthPlaywrightHelpers.expectAuthenticated(
					page,
					TEST_USERS.OWNER,
				);
			},

			/**
			 * Test caregiver authentication flow
			 */
			asCaregiver: async () => {
				await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.CAREGIVER);
				await StackAuthPlaywrightHelpers.expectAuthenticated(
					page,
					TEST_USERS.CAREGIVER,
				);
			},

			/**
			 * Test vet readonly authentication flow
			 */
			asVet: async () => {
				await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.VET_READONLY);
				await StackAuthPlaywrightHelpers.expectAuthenticated(
					page,
					TEST_USERS.VET_READONLY,
				);
			},

			/**
			 * Test unauthenticated flow
			 */
			asGuest: async () => {
				await StackAuthPlaywrightHelpers.signOut(page);
				await StackAuthPlaywrightHelpers.expectUnauthenticated(page);
			},

			/**
			 * Test custom user authentication flow
			 */
			asCustomUser: async (user: MockStackUser) => {
				await StackAuthPlaywrightHelpers.signIn(page, user);
				await StackAuthPlaywrightHelpers.expectAuthenticated(page, user);
			},
		};
	}

	/**
	 * Test helper for protected routes
	 */
	static async testProtectedRoute(
		page: Page,
		route: string,
		expectedRedirect: string = "/handler/sign-in",
	) {
		// Ensure user is signed out
		await StackAuthPlaywrightHelpers.signOut(page);

		// Try to access protected route
		await page.goto(route);

		// Should redirect to sign-in
		await expect(page).toHaveURL(
			new RegExp(expectedRedirect.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		);
	}

	/**
	 * Test helper for authenticated routes
	 */
	static async testAuthenticatedRoute(
		page: Page,
		route: string,
		user: MockStackUser = TEST_USERS.OWNER,
	) {
		// Sign in user
		await StackAuthPlaywrightHelpers.signIn(page, user);

		// Navigate to route
		await page.goto(route);

		// Should be able to access the route
		await expect(page).toHaveURL(
			new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
		);
	}
}

// Global type augmentation for Playwright
declare global {
	interface Window {
		__STACK_AUTH_MOCKED__?: boolean;
		__STACK_AUTH_USER__?: MockStackUser | null;
	}
}

export default StackAuthPlaywrightHelpers;
