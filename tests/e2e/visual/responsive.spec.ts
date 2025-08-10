import { test } from "@playwright/test";
import {
	takeVisualSnapshot,
	mockAuthenticatedUser,
	mockHouseholdData,
	VIEWPORTS,
	STABLE_CSS,
} from "./visual-helpers";

const CRITICAL_PAGES = [
	{ path: "/dashboard", name: "Dashboard" },
	{ path: "/admin/record", name: "Record Administration" },
	{ path: "/manage/animals", name: "Animal Management" },
	{ path: "/medications/inventory", name: "Medication Inventory" },
	{ path: "/medications/dosage-calculator", name: "Dosage Calculator" },
	{ path: "/settings", name: "Settings" },
];

const RESPONSIVE_BREAKPOINTS = [
	{ name: "Mobile Portrait", ...VIEWPORTS.MOBILE_PORTRAIT },
	{ name: "Mobile Landscape", ...VIEWPORTS.MOBILE_LANDSCAPE },
	{ name: "Tablet Portrait", ...VIEWPORTS.TABLET_PORTRAIT },
	{ name: "Tablet Landscape", ...VIEWPORTS.TABLET_LANDSCAPE },
	{ name: "Desktop Small", ...VIEWPORTS.DESKTOP_SMALL },
	{ name: "Desktop Large", ...VIEWPORTS.DESKTOP_LARGE },
];

test.describe("Responsive Design Visual Regression", () => {
	test.beforeEach(async ({ page }) => {
		await mockAuthenticatedUser(page);
		await mockHouseholdData(page);
	});

	// Test each critical page at all responsive breakpoints
	for (const criticalPage of CRITICAL_PAGES) {
		test.describe(criticalPage.name, () => {
			for (const viewport of RESPONSIVE_BREAKPOINTS) {
				test(`${viewport.name} (${viewport.width}x${viewport.height})`, async ({
					page,
				}) => {
					await page.setViewportSize({
						width: viewport.width,
						height: viewport.height,
					});
					await page.goto(criticalPage.path);

					// Wait for page to load and layout to stabilize
					await page.waitForLoadState("networkidle", { timeout: 10000 });
					await page.waitForTimeout(500);

					await takeVisualSnapshot(page, {
						name: `${criticalPage.name} - ${viewport.name}`,
						minHeight: Math.max(viewport.height, 800),
						percyCSS: `
              ${STABLE_CSS}
              /* Ensure consistent mobile navigation */
              .mobile-nav { position: static !important; }
              /* Stabilize responsive images */
              img { opacity: 1 !important; }
            `,
					});
				});
			}
		});
	}

	test("navigation components across breakpoints", async ({ page }) => {
		for (const viewport of RESPONSIVE_BREAKPOINTS) {
			await page.setViewportSize({
				width: viewport.width,
				height: viewport.height,
			});
			await page.goto("/dashboard");

			await takeVisualSnapshot(page, {
				name: `Navigation - ${viewport.name}`,
				waitFor: ['[data-testid="main-nav"]'],
				percyCSS: `
          ${STABLE_CSS}
          /* Focus on navigation area */
          main { opacity: 0.3 !important; }
        `,
			});
		}
	});

	test("modal dialogs responsive behavior", async ({ page }) => {
		const modalTriggers = [
			{
				path: "/manage/animals",
				trigger: '[data-testid="add-animal-button"]',
				modal: '[data-testid="animal-form"]',
			},
			{
				path: "/medications/inventory",
				trigger: '[data-testid="add-inventory-button"]',
				modal: '[data-testid="inventory-form"]',
			},
		];

		for (const { path, trigger, modal } of modalTriggers) {
			for (const viewport of [
				VIEWPORTS.MOBILE_PORTRAIT,
				VIEWPORTS.TABLET_PORTRAIT,
				VIEWPORTS.DESKTOP_SMALL,
			]) {
				await page.setViewportSize({
					width: viewport.width,
					height: viewport.height,
				});
				await page.goto(path);

				await page.click(trigger);
				await page.waitForSelector(modal);

				await takeVisualSnapshot(page, {
					name: `Modal Dialog - ${viewport.width}px - ${path.split("/").pop()}`,
					waitFor: [modal],
				});

				// Close modal
				const closeButton = page
					.locator('[data-testid="modal-close"], [aria-label="Close"]')
					.first();
				if (await closeButton.isVisible()) {
					await closeButton.click();
				}
			}
		}
	});

	test("form layouts responsive behavior", async ({ page }) => {
		const formPages = [
			{ path: "/admin/record", form: '[data-testid="admin-form"]' },
			{
				path: "/medications/dosage-calculator",
				form: '[data-testid="dosage-calculator"]',
			},
		];

		for (const { path, form } of formPages) {
			for (const viewport of [
				VIEWPORTS.MOBILE_PORTRAIT,
				VIEWPORTS.TABLET_LANDSCAPE,
				VIEWPORTS.DESKTOP_SMALL,
			]) {
				await page.setViewportSize({
					width: viewport.width,
					height: viewport.height,
				});
				await page.goto(path);

				await takeVisualSnapshot(page, {
					name: `Form Layout - ${viewport.width}px - ${path.split("/").pop()}`,
					waitFor: [form],
				});
			}
		}
	});

	test("data tables responsive behavior", async ({ page }) => {
		// Mock table data for consistent testing
		await page.addInitScript(() => {
			(window as any).__TEST_TABLE_DATA__ = Array(10)
				.fill(null)
				.map((_, i) => ({
					id: i + 1,
					name: `Item ${i + 1}`,
					type: i % 2 === 0 ? "Type A" : "Type B",
					status: i % 3 === 0 ? "Active" : "Inactive",
					date: "2024-01-15",
					notes: "Sample notes for this item",
				}));
		});

		const tablePages = [
			"/manage/animals",
			"/medications/inventory",
			"/dashboard/history",
		];

		for (const path of tablePages) {
			for (const viewport of [
				VIEWPORTS.MOBILE_PORTRAIT,
				VIEWPORTS.TABLET_PORTRAIT,
				VIEWPORTS.DESKTOP_LARGE,
			]) {
				await page.setViewportSize({
					width: viewport.width,
					height: viewport.height,
				});
				await page.goto(path);

				await takeVisualSnapshot(page, {
					name: `Table - ${viewport.width}px - ${path.split("/").pop()}`,
					waitFor: [
						'table, [data-testid="data-table"], [data-testid="list-view"]',
					],
				});
			}
		}
	});

	test("bottom navigation mobile behavior", async ({ page }) => {
		await page.setViewportSize(VIEWPORTS.MOBILE_PORTRAIT);

		const mobilePages = [
			"/dashboard",
			"/admin/record",
			"/manage/animals",
			"/settings",
		];

		for (const path of mobilePages) {
			await page.goto(path);

			await takeVisualSnapshot(page, {
				name: `Bottom Nav - ${path.split("/").pop()}`,
				waitFor: ['[data-testid="bottom-nav"], [data-testid="mobile-nav"]'],
				percyCSS: `
          ${STABLE_CSS}
          /* Highlight bottom navigation */
          [data-testid="bottom-nav"] { 
            border: 2px solid rgba(0, 100, 200, 0.3) !important; 
          }
        `,
			});
		}
	});

	test("sidebar behavior across breakpoints", async ({ page }) => {
		const viewportsWithSidebar = [
			VIEWPORTS.TABLET_LANDSCAPE,
			VIEWPORTS.DESKTOP_SMALL,
			VIEWPORTS.DESKTOP_LARGE,
		];

		for (const viewport of viewportsWithSidebar) {
			await page.setViewportSize({
				width: viewport.width,
				height: viewport.height,
			});
			await page.goto("/dashboard");

			// Test sidebar collapsed state
			const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
			if (await sidebarToggle.isVisible()) {
				await sidebarToggle.click();
				await page.waitForTimeout(300);
			}

			await takeVisualSnapshot(page, {
				name: `Sidebar Collapsed - ${viewport.width}px`,
				waitFor: ['[data-testid="sidebar"], [data-testid="main-nav"]'],
			});

			// Test sidebar expanded state
			if (await sidebarToggle.isVisible()) {
				await sidebarToggle.click();
				await page.waitForTimeout(300);
			}

			await takeVisualSnapshot(page, {
				name: `Sidebar Expanded - ${viewport.width}px`,
				waitFor: ['[data-testid="sidebar"], [data-testid="main-nav"]'],
			});
		}
	});

	test("touch-friendly interfaces on mobile", async ({ page }) => {
		await page.setViewportSize(VIEWPORTS.MOBILE_PORTRAIT);

		// Test touch-friendly button sizes
		await page.goto("/admin/record");

		await takeVisualSnapshot(page, {
			name: "Mobile Touch Interface",
			waitFor: ['[data-testid="admin-form"]'],
			percyCSS: `
        ${STABLE_CSS}
        /* Highlight touch targets */
        button, [role="button"], input, select, textarea {
          outline: 1px solid rgba(0, 200, 0, 0.3) !important;
          outline-offset: 2px !important;
        }
      `,
		});
	});

	test("landscape orientation layouts", async ({ page }) => {
		const landscapeViewport = VIEWPORTS.MOBILE_LANDSCAPE;
		await page.setViewportSize({
			width: landscapeViewport.width,
			height: landscapeViewport.height,
		});

		const pages = [
			"/dashboard",
			"/admin/record",
			"/medications/dosage-calculator",
		];

		for (const path of pages) {
			await page.goto(path);

			await takeVisualSnapshot(page, {
				name: `Landscape - ${path.split("/").pop()}`,
				minHeight: landscapeViewport.height,
			});
		}
	});

	test("overflow and scrolling behavior", async ({ page }) => {
		// Test with constrained viewport to ensure scrolling works
		await page.setViewportSize({ width: 375, height: 600 });

		const longContentPages = ["/dashboard/history", "/manage/animals"];

		for (const path of longContentPages) {
			await page.goto(path);

			// Scroll to test overflow behavior
			await page.evaluate(() => window.scrollTo(0, 200));
			await page.waitForTimeout(300);

			await takeVisualSnapshot(page, {
				name: `Scrolled Content - ${path.split("/").pop()}`,
				minHeight: 600,
			});
		}
	});
});
