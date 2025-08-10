import { test, expect } from "@playwright/test";
import {
	takeVisualSnapshot,
	testResponsiveView,
	mockAuthenticatedUser,
	mockHouseholdData,
	waitForCharts,
	STABLE_CSS,
} from "./visual-helpers";

test.describe("Dashboard Visual Regression", () => {
	test.beforeEach(async ({ page }) => {
		// Mock authentication and data
		await mockAuthenticatedUser(page);
		await mockHouseholdData(page);

		// Navigate to dashboard
		await page.goto("/dashboard");

		// Wait for dashboard to load
		await page.waitForSelector('[data-testid="dashboard-content"]', {
			timeout: 10000,
		});
	});

	test("dashboard overview renders correctly", async ({ page }) => {
		await takeVisualSnapshot(page, {
			name: "Dashboard Overview",
			waitFor: [
				'[data-testid="dashboard-content"]',
				'[data-testid="upcoming-doses-widget"]',
				'[data-testid="compliance-widget"]',
			],
			waitForNetworkIdle: true,
		});
	});

	test("dashboard with empty state", async ({ page }) => {
		// Navigate to fresh household with no data
		await page.goto("/dashboard?empty=true");

		await takeVisualSnapshot(page, {
			name: "Dashboard Empty State",
			waitFor: ['[data-testid="empty-dashboard"]'],
		});
	});

	test("dashboard responsive layouts", async ({ page }) => {
		await testResponsiveView(page, "Dashboard Overview", {
			waitFor: [
				'[data-testid="dashboard-content"]',
				'[data-testid="upcoming-doses-widget"]',
			],
		});
	});

	test("dashboard with loading states", async ({ page }) => {
		// Intercept API calls to delay them
		await page.route("**/api/trpc/**", async (route) => {
			await page.waitForTimeout(2000); // Simulate slow API
			await route.continue();
		});

		await page.goto("/dashboard");

		// Capture loading state
		await takeVisualSnapshot(page, {
			name: "Dashboard Loading State",
			waitFor: ['[data-testid="dashboard-loading"]'],
			waitForNetworkIdle: false,
		});

		// Wait for content to load
		await page.waitForSelector('[data-testid="dashboard-content"]', {
			timeout: 15000,
		});

		await takeVisualSnapshot(page, {
			name: "Dashboard Loaded State",
			waitForNetworkIdle: true,
		});
	});

	test("reporting dashboard with charts", async ({ page }) => {
		await page.goto("/dashboard/reports");

		// Wait for charts to render
		await waitForCharts(page);

		await takeVisualSnapshot(page, {
			name: "Reporting Dashboard",
			waitFor: ['[data-testid="reports-content"]', ".recharts-wrapper"],
			percyCSS: `
        ${STABLE_CSS}
        /* Ensure charts are fully rendered */
        .recharts-wrapper {
          opacity: 1 !important;
        }
      `,
		});
	});

	test("dashboard with different date ranges", async ({ page }) => {
		// Test 7-day view
		await page.click('[data-testid="date-range-selector"]');
		await page.click('[data-testid="date-range-7-days"]');
		await page.waitForTimeout(500);

		await takeVisualSnapshot(page, {
			name: "Dashboard 7 Day Range",
			waitFor: ['[data-testid="dashboard-content"]'],
		});

		// Test 30-day view
		await page.click('[data-testid="date-range-selector"]');
		await page.click('[data-testid="date-range-30-days"]');
		await page.waitForTimeout(500);

		await takeVisualSnapshot(page, {
			name: "Dashboard 30 Day Range",
			waitFor: ['[data-testid="dashboard-content"]'],
		});
	});

	test("dashboard with notifications", async ({ page }) => {
		// Add test notifications via API or mock
		await page.addInitScript(() => {
			(window as any).__TEST_NOTIFICATIONS__ = [
				{
					id: "notif-1",
					type: "OVERDUE",
					message: "Buddy's Prednisone dose is overdue",
					animalName: "Buddy",
					medicationName: "Prednisone",
					severity: "HIGH",
				},
				{
					id: "notif-2",
					type: "REMINDER",
					message: "Whiskers' checkup appointment tomorrow",
					animalName: "Whiskers",
					severity: "MEDIUM",
				},
			];
		});

		await page.reload();
		await page.waitForSelector('[data-testid="dashboard-content"]');

		await takeVisualSnapshot(page, {
			name: "Dashboard With Notifications",
			waitFor: [
				'[data-testid="notification-banner"]',
				'[data-testid="dashboard-content"]',
			],
		});
	});

	test("dashboard error states", async ({ page }) => {
		// Simulate API error
		await page.route("**/api/trpc/**", async (route) => {
			await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ error: "Internal Server Error" }),
			});
		});

		await page.goto("/dashboard");

		await takeVisualSnapshot(page, {
			name: "Dashboard Error State",
			waitFor: ['[data-testid="dashboard-error"]'],
		});
	});

	test("dashboard dark mode", async ({ page }) => {
		// Enable dark mode
		await page.emulateMedia({ colorScheme: "dark" });

		// Or click dark mode toggle if available
		const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');
		if (await darkModeToggle.isVisible()) {
			await darkModeToggle.click();
		}

		await page.goto("/dashboard");
		await page.waitForSelector('[data-testid="dashboard-content"]');

		await takeVisualSnapshot(page, {
			name: "Dashboard Dark Mode",
			waitFor: ['[data-testid="dashboard-content"]'],
		});
	});

	test("dashboard with multiple animals", async ({ page }) => {
		// Mock data for multiple animals
		await page.addInitScript(() => {
			(window as any).__TEST_HOUSEHOLD__ = {
				id: "test-household-123",
				name: "Multi Pet Family",
				animals: [
					{ id: "1", name: "Buddy", species: "DOG", breed: "Golden Retriever" },
					{ id: "2", name: "Whiskers", species: "CAT", breed: "Maine Coon" },
					{ id: "3", name: "Charlie", species: "DOG", breed: "Border Collie" },
					{ id: "4", name: "Luna", species: "CAT", breed: "Siamese" },
				],
			};
		});

		await page.reload();
		await page.waitForSelector('[data-testid="dashboard-content"]');

		await takeVisualSnapshot(page, {
			name: "Dashboard Multi Animal",
			waitFor: ['[data-testid="animal-switcher"]'],
		});
	});
});
