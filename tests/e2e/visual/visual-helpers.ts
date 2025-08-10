import { Page } from "@playwright/test";
import percySnapshot from "@percy/playwright";

export interface VisualTestOptions {
	/**
	 * Name for the Percy snapshot
	 */
	name: string;

	/**
	 * Wait for specific elements to be visible before taking snapshot
	 */
	waitFor?: string[];

	/**
	 * Wait for network to be idle
	 */
	waitForNetworkIdle?: boolean;

	/**
	 * Custom widths to test (overrides default)
	 */
	widths?: number[];

	/**
	 * Minimum height for the snapshot
	 */
	minHeight?: number;

	/**
	 * Custom CSS to inject
	 */
	percyCSS?: string;

	/**
	 * Selectors to ignore in visual comparison
	 */
	ignoreRegions?: string[];

	/**
	 * Enable mobile viewport
	 */
	enableMobile?: boolean;
}

/**
 * Standard viewports for testing
 */
export const VIEWPORTS = {
	MOBILE_PORTRAIT: { width: 375, height: 667 },
	MOBILE_LANDSCAPE: { width: 667, height: 375 },
	TABLET_PORTRAIT: { width: 768, height: 1024 },
	TABLET_LANDSCAPE: { width: 1024, height: 768 },
	DESKTOP_SMALL: { width: 1280, height: 800 },
	DESKTOP_LARGE: { width: 1920, height: 1080 },
} as const;

/**
 * Common CSS for stabilizing visual tests
 */
export const STABLE_CSS = `
  /* Hide dynamic content */
  [data-testid="current-time"],
  [data-testid="last-sync-time"],
  [data-testid="session-id"],
  .toast-container,
  .notification-badge {
    opacity: 0 !important;
  }
  
  /* Disable animations */
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  
  /* Stabilize loading states */
  .animate-pulse,
  .animate-spin {
    animation: none !important;
  }
  
  /* Fix chart rendering for consistency */
  .recharts-wrapper svg {
    animation: none !important;
  }
`;

/**
 * Take a visual snapshot with Percy
 */
export async function takeVisualSnapshot(
	page: Page,
	options: VisualTestOptions,
): Promise<void> {
	const {
		name,
		waitFor = [],
		waitForNetworkIdle = true,
		percyCSS = STABLE_CSS,
		minHeight,
	} = options;

	// Wait for specific elements to be visible
	for (const selector of waitFor) {
		await page.waitForSelector(selector, { timeout: 10000 });
	}

	// Wait for network to be idle if requested
	if (waitForNetworkIdle) {
		await page.waitForLoadState("networkidle", { timeout: 10000 });
	}

	// Add small delay to ensure rendering is complete
	await page.waitForTimeout(500);

	// Take the snapshot
	await percySnapshot(page, name, {
		percyCSS,
		minHeight,
	});
}

/**
 * Test a page across multiple responsive breakpoints
 */
export async function testResponsiveView(
	page: Page,
	baseName: string,
	options: Omit<VisualTestOptions, "name"> = {},
): Promise<void> {
	const viewports = [
		{ name: "Mobile", ...VIEWPORTS.MOBILE_PORTRAIT },
		{ name: "Tablet", ...VIEWPORTS.TABLET_PORTRAIT },
		{ name: "Desktop", ...VIEWPORTS.DESKTOP_SMALL },
	];

	for (const viewport of viewports) {
		await page.setViewportSize({
			width: viewport.width,
			height: viewport.height,
		});

		// Allow time for responsive layout changes
		await page.waitForTimeout(300);

		await takeVisualSnapshot(page, {
			...options,
			name: `${baseName} - ${viewport.name}`,
		});
	}
}

/**
 * Test component in different states
 */
export async function testComponentStates(
	page: Page,
	baseName: string,
	states: Array<{
		name: string;
		setup: () => Promise<void>;
	}>,
	options: Omit<VisualTestOptions, "name"> = {},
): Promise<void> {
	for (const state of states) {
		await state.setup();

		// Allow time for state changes to render
		await page.waitForTimeout(300);

		await takeVisualSnapshot(page, {
			...options,
			name: `${baseName} - ${state.name}`,
		});
	}
}

/**
 * Mock authentication for visual tests
 */
export async function mockAuthenticatedUser(page: Page): Promise<void> {
	// Mock authentication context
	await page.addInitScript(() => {
		// Mock Stack Auth
		(window as any).__STACK_AUTH_USER__ = {
			id: "test-user-123",
			displayName: "Test User",
			primaryEmail: "test@example.com",
			profileImageUrl: null,
			signedIn: true,
		};
	});
}

/**
 * Mock household and animal data for consistent visuals
 */
export async function mockHouseholdData(page: Page): Promise<void> {
	await page.addInitScript(() => {
		// Mock household data
		(window as any).__TEST_HOUSEHOLD__ = {
			id: "test-household-123",
			name: "Test Family",
			animals: [
				{
					id: "test-animal-123",
					name: "Buddy",
					species: "DOG",
					breed: "Golden Retriever",
					weight: 65,
				},
				{
					id: "test-animal-456",
					name: "Whiskers",
					species: "CAT",
					breed: "Maine Coon",
					weight: 12,
				},
			],
		};
	});
}

/**
 * Wait for charts to finish rendering
 */
export async function waitForCharts(page: Page): Promise<void> {
	// Wait for Recharts to finish rendering
	await page.waitForFunction(
		() => {
			const charts = document.querySelectorAll(".recharts-wrapper");
			return Array.from(charts).every((chart) => {
				const svg = chart.querySelector("svg");
				return svg && svg.children.length > 0;
			});
		},
		{ timeout: 10000 },
	);

	// Additional wait for animations to settle
	await page.waitForTimeout(1000);
}

/**
 * Fill form with test data
 */
export async function fillTestForm(
	page: Page,
	data: Record<string, string>,
): Promise<void> {
	for (const [field, value] of Object.entries(data)) {
		const input = page.locator(`[name="${field}"], [data-testid="${field}"]`);
		if (await input.isVisible()) {
			await input.fill(value);
		}
	}

	// Allow form validation to complete
	await page.waitForTimeout(300);
}

/**
 * Set up test data for medication recording
 */
export async function setupMedicationTestData(page: Page): Promise<void> {
	await page.addInitScript(() => {
		(window as any).__TEST_MEDICATIONS__ = [
			{
				id: "test-med-1",
				name: "Prednisone",
				concentration: "5mg",
				form: "TABLET",
			},
			{
				id: "test-med-2",
				name: "Gabapentin",
				concentration: "100mg",
				form: "CAPSULE",
			},
		];

		(window as any).__TEST_REGIMENS__ = [
			{
				id: "test-regimen-1",
				animalId: "test-animal-123",
				medicationId: "test-med-1",
				dosage: "5mg",
				frequency: "TWICE_DAILY",
				instructions: "Give with food",
			},
		];
	});
}
