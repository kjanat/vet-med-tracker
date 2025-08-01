import type { Page } from "@playwright/test";
import type { MockReactProps, MockWindow } from "./types";

/**
 * Login helper for authenticated routes
 */
export async function login(page: Page, email = "test@example.com") {
	// Mock auth state
	await page.addInitScript((userEmail) => {
		// Set auth cookies or localStorage
		localStorage.setItem("auth-token", "mock-token");
		localStorage.setItem("user-email", userEmail);

		// Mock auth hook
		(window as any).mockAuthUser = {
			id: "user-123",
			email: userEmail,
			name: "Test User",
			households: [
				{
					id: "household-123",
					name: "Test Household",
					role: "OWNER",
				},
			],
		};
	}, email);

	// Navigate to app
	await page.goto("/");
}

/**
 * Wait for React to be ready
 */
export async function waitForReact(page: Page) {
	await page.waitForFunction(() => {
		// Check if React is loaded and app is rendered
		const root = document.getElementById("__next");
		return root && root.children.length > 0;
	});
}

/**
 * Add test data attributes for better test targeting
 */
export async function addTestIds(page: Page) {
	await page.addInitScript(() => {
		// Helper function to add test IDs
		const addTestIdToProps = (type: string, props: MockReactProps) => {
			const newProps = { ...props };

			if (type === "button" && props.children) {
				newProps["data-testid"] =
					newProps["data-testid"] ||
					`button-${String(props.children).toLowerCase().replace(/\s+/g, "-")}`;
			} else if (type === "input" && props.name) {
				newProps["data-testid"] =
					newProps["data-testid"] || `input-${props.name}`;
			} else if (type === "select" && props.name) {
				newProps["data-testid"] =
					newProps["data-testid"] || `select-${props.name}`;
			}

			return newProps;
		};

		// Override React createElement to add test IDs
		const originalCreateElement = (window as any).React?.createElement;
		if (originalCreateElement && (window as any).React) {
			(window as any).React!.createElement = function (...args: unknown[]) {
				const [type, props, ...children] = args;

				// Add test IDs based on component type or className
				if (props && typeof type === "string") {
					const newProps = addTestIdToProps(type, props as MockReactProps);
					return originalCreateElement.call(this, type, newProps, ...children);
				}

				return originalCreateElement.apply(
					this,
					args as [unknown, ...unknown[]],
				);
			};
		}
	});
}

/**
 * Mock date/time for consistent testing
 */
export async function mockDateTime(page: Page, dateTime: Date) {
	await page.addInitScript((timestamp) => {
		// Mock Date constructor
		const OriginalDate = Date;
		(window as any).Date = class extends OriginalDate {
			constructor(...args: unknown[]) {
				if (args.length === 0) {
					super(timestamp);
				} else {
					super(...(args as ConstructorParameters<typeof Date>));
				}
			}

			static now() {
				return timestamp;
			}
		};

		// Preserve other Date methods
		Object.setPrototypeOf((window as any).Date, OriginalDate);
		Object.setPrototypeOf(
			(window as any).Date.prototype,
			OriginalDate.prototype,
		);
	}, dateTime.getTime());
}

/**
 * Mock geolocation for timezone testing
 */
export async function mockGeolocation(
	page: Page,
	latitude: number,
	longitude: number,
) {
	await page.context().setGeolocation({ latitude, longitude });
	await page.context().grantPermissions(["geolocation"]);
}

/**
 * Mock timezone for testing
 */
export async function mockTimezone(page: Page, timezone: string) {
	await page.addInitScript((tz) => {
		// Override Intl.DateTimeFormat
		const OriginalDateTimeFormat = Intl.DateTimeFormat;
		(window as any).Intl.DateTimeFormat = class extends OriginalDateTimeFormat {
			constructor(
				locale?: string | string[],
				options?: Intl.DateTimeFormatOptions,
			) {
				super(locale, { ...options, timeZone: tz });
			}
		};

		// Override Date.prototype.toLocaleString and related methods
		const dateProto = Date.prototype;
		const originalToLocaleString = dateProto.toLocaleString;
		dateProto.toLocaleString = function (
			locale?: string | string[],
			options?: Intl.DateTimeFormatOptions,
		) {
			return originalToLocaleString.call(this, locale, {
				...options,
				timeZone: tz,
			});
		};
	}, timezone);
}

/**
 * Wait for loading states to complete
 */
export async function waitForLoading(page: Page) {
	// Wait for any loading spinners to disappear
	await page.waitForFunction(() => {
		const spinners = document.querySelectorAll('[aria-label="Loading"]');
		const loadingTexts = document.querySelectorAll("*");
		const hasLoadingText = Array.from(loadingTexts).some((el) =>
			el.textContent?.includes("Loading..."),
		);
		return spinners.length === 0 && !hasLoadingText;
	});
}

/**
 * Fill form field with proper events
 */
export async function fillFormField(
	page: Page,
	selector: string,
	value: string,
) {
	const element = page.locator(selector);
	await element.click();
	await element.fill("");
	await element.type(value, { delay: 50 });
	await element.blur();
}

/**
 * Select dropdown option
 */
export async function selectOption(
	page: Page,
	selector: string,
	value: string,
) {
	const element = page.locator(selector);
	await element.click();
	await page.getByRole("option", { name: value }).click();
}

/**
 * Upload file
 */
export async function uploadFile(
	page: Page,
	selector: string,
	filePath: string,
) {
	const fileInput = page.locator(selector);
	await fileInput.setInputFiles(filePath);
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	await page.screenshot({
		path: `tests/screenshots/${name}-${timestamp}.png`,
		fullPage: true,
	});
}

/**
 * Mock network responses
 */
export async function mockApiResponse(
	page: Page,
	url: string,
	response: unknown,
) {
	await page.route(url, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(response),
		});
	});
}

/**
 * Mock network error
 */
export async function mockApiError(page: Page, url: string, status = 500) {
	await page.route(url, async (route) => {
		await route.fulfill({
			status,
			contentType: "application/json",
			body: JSON.stringify({ error: "Mock server error" }),
		});
	});
}

/**
 * Wait for toast notification
 */
export async function waitForToast(page: Page, text: string) {
	await page.getByRole("status").filter({ hasText: text }).waitFor();
}

/**
 * Dismiss all toasts
 */
export async function dismissToasts(page: Page) {
	const toasts = await page.getByRole("status").all();
	for (const toast of toasts) {
		const closeButton = toast.getByRole("button", { name: "Close" });
		if (await closeButton.isVisible()) {
			await closeButton.click();
		}
	}
}
