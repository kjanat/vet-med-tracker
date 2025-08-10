import { test } from "@playwright/test";
import {
	takeVisualSnapshot,
	testResponsiveView,
	testComponentStates,
	mockAuthenticatedUser,
	mockHouseholdData,
	fillTestForm,
	STABLE_CSS,
} from "./visual-helpers";

test.describe("Animal Management Visual Regression", () => {
	test.beforeEach(async ({ page }) => {
		await mockAuthenticatedUser(page);
		await mockHouseholdData(page);
	});

	test("animal profile with complete information", async ({ page }) => {
		// Mock detailed animal data
		await page.addInitScript(() => {
			(window as any).__TEST_ANIMAL_DETAIL__ = {
				id: "test-animal-123",
				name: "Buddy",
				species: "DOG",
				breed: "Golden Retriever",
				birthDate: "2020-03-15",
				weight: 65,
				microchipId: "123456789012345",
				profileImageUrl: "/test-images/buddy.jpg",
				medicalHistory: [
					{
						date: "2024-01-15",
						condition: "Routine checkup",
						notes: "All good",
					},
					{
						date: "2023-12-01",
						condition: "Vaccination",
						notes: "Annual vaccines",
					},
				],
				currentMedications: [
					{ name: "Prednisone", dosage: "5mg", frequency: "TWICE_DAILY" },
					{
						name: "Gabapentin",
						dosage: "100mg",
						frequency: "THREE_TIMES_DAILY",
					},
				],
			};
		});

		await page.goto("/manage/animals/test-animal-123");

		await takeVisualSnapshot(page, {
			name: "Animal Profile Complete",
			waitFor: [
				'[data-testid="animal-profile"]',
				'[data-testid="animal-info-card"]',
				'[data-testid="medical-history"]',
			],
		});
	});

	test("animal profile with photo gallery", async ({ page }) => {
		await page.goto("/manage/animals/test-animal-123");

		// Initial profile view
		await takeVisualSnapshot(page, {
			name: "Animal Profile With Photos",
			waitFor: ['[data-testid="animal-profile"]'],
		});

		// Test photo gallery expansion
		const photoGallery = page.locator('[data-testid="photo-gallery-expand"]');
		if (await photoGallery.isVisible()) {
			await photoGallery.click();
			await page.waitForTimeout(500);

			await takeVisualSnapshot(page, {
				name: "Animal Profile Photo Gallery Expanded",
				waitFor: ['[data-testid="photo-gallery-modal"]'],
			});
		}
	});

	test("animal list with different view modes", async ({ page }) => {
		await page.goto("/manage/animals");

		// Grid view
		await takeVisualSnapshot(page, {
			name: "Animal List Grid View",
			waitFor: ['[data-testid="animal-grid"]'],
		});

		// Switch to list view if available
		const listViewToggle = page.locator('[data-testid="view-toggle-list"]');
		if (await listViewToggle.isVisible()) {
			await listViewToggle.click();
			await page.waitForTimeout(300);

			await takeVisualSnapshot(page, {
				name: "Animal List Table View",
				waitFor: ['[data-testid="animal-table"]'],
			});
		}
	});

	test("animal form states", async ({ page }) => {
		await page.goto("/manage/animals");
		await page.click('[data-testid="add-animal-button"]');

		await testComponentStates(page, "Animal Form", [
			{
				name: "Empty Form",
				setup: async () => {
					await page.waitForSelector('[data-testid="animal-form"]');
				},
			},
			{
				name: "Partially Filled",
				setup: async () => {
					await fillTestForm(page, {
						name: "Buddy",
						species: "DOG",
						breed: "Golden Retriever",
					});
				},
			},
			{
				name: "With Validation Errors",
				setup: async () => {
					await page.fill('[name="name"]', "");
					await page.fill('[name="weight"]', "-5"); // Invalid weight
					await page.click('[data-testid="submit-button"]');
					await page.waitForTimeout(300);
				},
			},
			{
				name: "Complete Form",
				setup: async () => {
					await fillTestForm(page, {
						name: "Buddy",
						species: "DOG",
						breed: "Golden Retriever",
						weight: "65",
						birthDate: "2020-03-15",
					});
				},
			},
		]);
	});

	test("animal emergency information", async ({ page }) => {
		await page.goto("/manage/animals/test-animal-123/emergency");

		await takeVisualSnapshot(page, {
			name: "Animal Emergency Info",
			waitFor: ['[data-testid="emergency-info"]'],
		});
	});

	test("animal profile responsive design", async ({ page }) => {
		await page.goto("/manage/animals/test-animal-123");

		await testResponsiveView(page, "Animal Profile", {
			waitFor: ['[data-testid="animal-profile"]'],
		});
	});

	test("animal profile with missing data", async ({ page }) => {
		// Mock minimal animal data
		await page.addInitScript(() => {
			(window as any).__TEST_ANIMAL_DETAIL__ = {
				id: "test-animal-minimal",
				name: "Stray Cat",
				species: "CAT",
				// Missing breed, weight, photo, etc.
			};
		});

		await page.goto("/manage/animals/test-animal-minimal");

		await takeVisualSnapshot(page, {
			name: "Animal Profile Minimal Data",
			waitFor: ['[data-testid="animal-profile"]'],
		});
	});

	test("bulk animal management", async ({ page }) => {
		await page.goto("/manage/animals");

		// Enable bulk selection if available
		const bulkToggle = page.locator('[data-testid="bulk-select-toggle"]');
		if (await bulkToggle.isVisible()) {
			await bulkToggle.click();
			await page.waitForTimeout(300);

			// Select some animals
			await page.click('[data-testid="select-animal-1"]');
			await page.click('[data-testid="select-animal-2"]');

			await takeVisualSnapshot(page, {
				name: "Animal List Bulk Selection",
				waitFor: ['[data-testid="bulk-actions-bar"]'],
			});
		}
	});

	test("animal profile dark mode", async ({ page }) => {
		await page.emulateMedia({ colorScheme: "dark" });
		await page.goto("/manage/animals/test-animal-123");

		await takeVisualSnapshot(page, {
			name: "Animal Profile Dark Mode",
			waitFor: ['[data-testid="animal-profile"]'],
		});
	});

	test("animal search and filters", async ({ page }) => {
		await page.goto("/manage/animals");

		// Test search functionality
		await page.fill('[data-testid="animal-search"]', "Buddy");
		await page.waitForTimeout(500);

		await takeVisualSnapshot(page, {
			name: "Animal List Search Results",
			waitFor: ['[data-testid="animal-grid"]'],
		});

		// Test filters
		await page.click('[data-testid="filter-species"]');
		await page.click('[data-testid="filter-dogs"]');
		await page.waitForTimeout(500);

		await takeVisualSnapshot(page, {
			name: "Animal List Filtered Dogs",
			waitFor: ['[data-testid="animal-grid"]'],
		});
	});

	test("animal card variations", async ({ page }) => {
		// Mock different animal types
		await page.addInitScript(() => {
			(window as any).__TEST_HOUSEHOLD__.animals = [
				{
					id: "1",
					name: "Buddy",
					species: "DOG",
					breed: "Golden Retriever",
					status: "ACTIVE",
					hasPhoto: true,
					medicationCount: 2,
				},
				{
					id: "2",
					name: "Whiskers",
					species: "CAT",
					breed: "Unknown",
					status: "INACTIVE",
					hasPhoto: false,
					medicationCount: 0,
				},
				{
					id: "3",
					name: "Charlie",
					species: "BIRD",
					breed: "Cockatiel",
					status: "ACTIVE",
					hasPhoto: true,
					medicationCount: 1,
				},
			];
		});

		await page.goto("/manage/animals");

		await takeVisualSnapshot(page, {
			name: "Animal Cards Various Species",
			waitFor: ['[data-testid="animal-grid"]'],
		});
	});
});
