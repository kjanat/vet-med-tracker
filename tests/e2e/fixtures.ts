import { test as base, type Page } from "@playwright/test";

// Define custom fixtures
type MyFixtures = {
	authenticatedPage: Page;
};

// Extend base test with custom fixtures
export const test = base.extend<MyFixtures>({
	authenticatedPage: async ({ page }, use) => {
		// Mock authentication by setting cookies/localStorage
		await page.goto("/");

		// Set auth cookies (adjust based on your auth implementation)
		await page.context().addCookies([
			{
				name: "auth-token",
				value: "mock-auth-token",
				domain: "localhost",
				path: "/",
				httpOnly: true,
				secure: false,
				sameSite: "Lax",
			},
		]);

		// Or use localStorage if that's how you store auth
		await page.evaluate(() => {
			localStorage.setItem("auth-token", "mock-auth-token");
			localStorage.setItem(
				"user",
				JSON.stringify({
					id: "test-user-1",
					email: "test@example.com",
					name: "Test User",
				}),
			);
		});

		await use(page);
	},
});

export { expect } from "@playwright/test";

// Page object models
export class LoginPage {
	constructor(public page: Page) {}

	async goto() {
		await this.page.goto("/login");
	}

	async login(email: string, password: string) {
		await this.page.fill('input[name="email"]', email);
		await this.page.fill('input[name="password"]', password);
		await this.page.click('button[type="submit"]');
	}
}

export class RecordPage {
	constructor(public page: Page) {}

	async goto() {
		await this.page.goto("/admin/record");
	}

	async selectAnimal(animalName: string) {
		await this.page.click('[data-testid="animal-selector"]');
		await this.page.click(`[data-testid="animal-option-${animalName}"]`);
	}

	async selectRegimen(regimenName: string) {
		await this.page.click('[data-testid="regimen-selector"]');
		await this.page.click(`[data-testid="regimen-option-${regimenName}"]`);
	}

	async holdToConfirm() {
		const confirmButton = this.page.locator('[data-testid="confirm-button"]');
		await confirmButton.hover();
		await this.page.keyboard.down("Space");
		await this.page.waitForTimeout(3000); // Wait for hold duration
		await this.page.keyboard.up("Space");
	}

	async waitForSuccess() {
		await this.page.waitForSelector('[data-testid="success-message"]');
	}
}

export class InventoryPage {
	constructor(public page: Page) {}

	async goto() {
		await this.page.goto("/inventory");
	}

	async addItem(data: {
		medication: string;
		quantity: string;
		expiryDate: string;
	}) {
		await this.page.click('[data-testid="add-inventory-button"]');
		await this.page.fill('[data-testid="medication-search"]', data.medication);
		await this.page.click(
			`[data-testid="medication-option-${data.medication}"]`,
		);
		await this.page.fill('[data-testid="quantity-input"]', data.quantity);
		await this.page.fill('[data-testid="expiry-date-input"]', data.expiryDate);
		await this.page.click('[data-testid="save-button"]');
	}

	async markAsInUse(itemId: string) {
		await this.page.click(`[data-testid="inventory-item-${itemId}"]`);
		await this.page.click('[data-testid="mark-in-use-button"]');
	}
}

// Test data helpers
export const testData = {
	user: {
		email: "test@example.com",
		password: "password123",
		name: "Test User",
	},
	household: {
		name: "Test Household",
	},
	animal: {
		name: "Buddy",
		species: "dog",
		breed: "Golden Retriever",
	},
	medication: {
		name: "Amoxicillin",
		dosage: "250mg",
		frequency: "BID",
	},
};

// Utility functions
export async function waitForNetworkIdle(page: Page) {
	await page.waitForLoadState("networkidle");
}

export async function mockApiResponse(
	page: Page,
	url: string,
	response: unknown,
) {
	await page.route(url, (route) => {
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(response),
		});
	});
}
