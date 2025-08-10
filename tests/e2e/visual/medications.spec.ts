import { test } from "@playwright/test";
import {
	takeVisualSnapshot,
	testResponsiveView,
	testComponentStates,
	mockAuthenticatedUser,
	mockHouseholdData,
	setupMedicationTestData,
	fillTestForm,
	STABLE_CSS,
} from "./visual-helpers";

test.describe("Medication Features Visual Regression", () => {
	test.beforeEach(async ({ page }) => {
		await mockAuthenticatedUser(page);
		await mockHouseholdData(page);
		await setupMedicationTestData(page);
	});

	test("dosage calculator interface", async ({ page }) => {
		await page.goto("/medications/dosage-calculator");

		// Empty calculator
		await takeVisualSnapshot(page, {
			name: "Dosage Calculator Empty",
			waitFor: ['[data-testid="dosage-calculator"]'],
		});

		// Fill in basic information
		await fillTestForm(page, {
			medication: "Prednisone",
			animalWeight: "25",
			dosagePerKg: "0.5",
		});

		await takeVisualSnapshot(page, {
			name: "Dosage Calculator Filled",
			waitFor: ['[data-testid="dosage-calculator"]'],
		});

		// Calculate dosage
		await page.click('[data-testid="calculate-btn"]');
		await page.waitForTimeout(500);

		await takeVisualSnapshot(page, {
			name: "Dosage Calculator Results",
			waitFor: ['[data-testid="calculation-results"]'],
		});
	});

	test("dosage calculator responsive design", async ({ page }) => {
		await page.goto("/medications/dosage-calculator");

		await testResponsiveView(page, "Dosage Calculator", {
			waitFor: ['[data-testid="dosage-calculator"]'],
		});
	});

	test("dosage calculator with different units", async ({ page }) => {
		await page.goto("/medications/dosage-calculator");

		await testComponentStates(page, "Dosage Calculator Units", [
			{
				name: "Metric Units",
				setup: async () => {
					await page.selectOption('[data-testid="weight-unit"]', "kg");
					await page.selectOption('[data-testid="dosage-unit"]', "mg/kg");
				},
			},
			{
				name: "Imperial Units",
				setup: async () => {
					await page.selectOption('[data-testid="weight-unit"]', "lbs");
					await page.selectOption('[data-testid="dosage-unit"]', "mg/lb");
				},
			},
		]);
	});

	test("medication inventory interface", async ({ page }) => {
		await page.goto("/medications/inventory");

		await takeVisualSnapshot(page, {
			name: "Medication Inventory",
			waitFor: ['[data-testid="inventory-list"]'],
		});
	});

	test("inventory with different stock levels", async ({ page }) => {
		// Mock inventory data with various stock levels
		await page.addInitScript(() => {
			(window as any).__TEST_INVENTORY__ = [
				{
					id: "1",
					medicationName: "Prednisone 5mg",
					currentStock: 0,
					daysOfSupply: 0,
					status: "OUT_OF_STOCK",
					expiryDate: "2024-12-31",
				},
				{
					id: "2",
					medicationName: "Gabapentin 100mg",
					currentStock: 5,
					daysOfSupply: 3,
					status: "LOW_STOCK",
					expiryDate: "2024-10-15",
				},
				{
					id: "3",
					medicationName: "Rimadyl 75mg",
					currentStock: 30,
					daysOfSupply: 15,
					status: "ADEQUATE",
					expiryDate: "2025-06-30",
				},
				{
					id: "4",
					medicationName: "Metacam 1.5mg/ml",
					currentStock: 2,
					daysOfSupply: 45,
					status: "EXPIRED",
					expiryDate: "2023-11-01",
				},
			];
		});

		await page.goto("/medications/inventory");

		await takeVisualSnapshot(page, {
			name: "Inventory Stock Level Variations",
			waitFor: ['[data-testid="inventory-list"]'],
		});
	});

	test("add inventory item modal", async ({ page }) => {
		await page.goto("/medications/inventory");
		await page.click('[data-testid="add-inventory-button"]');

		await testComponentStates(page, "Add Inventory Modal", [
			{
				name: "Empty Form",
				setup: async () => {
					await page.waitForSelector('[data-testid="inventory-form"]');
				},
			},
			{
				name: "With Medication Selected",
				setup: async () => {
					await page.click('[data-testid="medication-select"]');
					await page.click('[data-testid="medication-option-prednisone"]');
					await page.waitForTimeout(300);
				},
			},
			{
				name: "Complete Form",
				setup: async () => {
					await fillTestForm(page, {
						quantity: "30",
						expiryDate: "2024-12-31",
						lotNumber: "LOT12345",
						cost: "15.99",
					});
				},
			},
		]);
	});

	test("regimens list interface", async ({ page }) => {
		await page.goto("/medications/regimens");

		await takeVisualSnapshot(page, {
			name: "Regimens List",
			waitFor: ['[data-testid="regimens-list"]'],
		});
	});

	test("regimen form with different frequencies", async ({ page }) => {
		await page.goto("/medications/regimens");
		await page.click('[data-testid="add-regimen-button"]');

		await testComponentStates(page, "Regimen Form", [
			{
				name: "Basic Information",
				setup: async () => {
					await fillTestForm(page, {
						animal: "Buddy",
						medication: "Prednisone",
						dosage: "5mg",
					});
				},
			},
			{
				name: "Once Daily",
				setup: async () => {
					await page.selectOption(
						'[data-testid="frequency-select"]',
						"ONCE_DAILY",
					);
					await page.waitForTimeout(300);
				},
			},
			{
				name: "Twice Daily",
				setup: async () => {
					await page.selectOption(
						'[data-testid="frequency-select"]',
						"TWICE_DAILY",
					);
					await page.waitForTimeout(300);
				},
			},
			{
				name: "Custom Schedule",
				setup: async () => {
					await page.selectOption('[data-testid="frequency-select"]', "CUSTOM");
					await page.waitForTimeout(300);
				},
			},
		]);
	});

	test("medication search interface", async ({ page }) => {
		await page.goto("/medications/regimens");
		await page.click('[data-testid="add-regimen-button"]');

		// Test medication search/autocomplete
		await page.fill('[data-testid="medication-search"]', "pred");
		await page.waitForTimeout(500);

		await takeVisualSnapshot(page, {
			name: "Medication Search Results",
			waitFor: ['[data-testid="medication-dropdown"]'],
		});
	});

	test("medication details modal", async ({ page }) => {
		await page.goto("/medications/regimens");

		// Click on medication info button
		await page.click('[data-testid="medication-info-btn"]');

		await takeVisualSnapshot(page, {
			name: "Medication Details Modal",
			waitFor: ['[data-testid="medication-details-modal"]'],
		});
	});

	test("inventory low stock alerts", async ({ page }) => {
		// Mock low stock items
		await page.addInitScript(() => {
			(window as any).__LOW_STOCK_ALERTS__ = [
				{
					medicationName: "Prednisone 5mg",
					daysRemaining: 2,
					currentStock: 3,
					animalName: "Buddy",
				},
				{
					medicationName: "Gabapentin 100mg",
					daysRemaining: 0,
					currentStock: 0,
					animalName: "Whiskers",
				},
			];
		});

		await page.goto("/medications/inventory");

		await takeVisualSnapshot(page, {
			name: "Inventory Low Stock Alerts",
			waitFor: ['[data-testid="low-stock-alerts"]'],
		});
	});

	test("medication administration calendar", async ({ page }) => {
		await page.goto("/medications/regimens");
		await page.click('[data-testid="calendar-view-toggle"]');

		await takeVisualSnapshot(page, {
			name: "Medication Calendar View",
			waitFor: ['[data-testid="medication-calendar"]'],
		});
	});

	test("medication form validation states", async ({ page }) => {
		await page.goto("/medications/regimens");
		await page.click('[data-testid="add-regimen-button"]');

		// Submit empty form to trigger validation
		await page.click('[data-testid="submit-button"]');
		await page.waitForTimeout(500);

		await takeVisualSnapshot(page, {
			name: "Regimen Form Validation Errors",
			waitFor: ['[data-testid="validation-errors"]'],
		});
	});

	test("medication dark mode", async ({ page }) => {
		await page.emulateMedia({ colorScheme: "dark" });
		await page.goto("/medications/dosage-calculator");

		await takeVisualSnapshot(page, {
			name: "Dosage Calculator Dark Mode",
			waitFor: ['[data-testid="dosage-calculator"]'],
		});
	});
});
