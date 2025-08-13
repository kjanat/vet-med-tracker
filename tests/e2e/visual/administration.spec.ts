import { test } from "@playwright/test";
import {
  fillTestForm,
  mockAuthenticatedUser,
  mockHouseholdData,
  setupMedicationTestData,
  takeVisualSnapshot,
  testComponentStates,
  testResponsiveView,
} from "./visual-helpers";

test.describe("Administration Recording Visual Regression", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockHouseholdData(page);
    await setupMedicationTestData(page);
  });

  test("administration form empty state", async ({ page }) => {
    await page.goto("/admin/record");

    await takeVisualSnapshot(page, {
      name: "Admin Form Empty",
      waitFor: ['[data-testid="admin-form"]'],
    });
  });

  test("administration form with animal selected", async ({ page }) => {
    await page.goto("/admin/record");

    // Select an animal
    await page.click('[data-testid="animal-select"]');
    await page.click('[data-testid="animal-option-buddy"]');
    await page.waitForTimeout(500);

    await takeVisualSnapshot(page, {
      name: "Admin Form Animal Selected",
      waitFor: ['[data-testid="available-medications"]'],
    });
  });

  test("administration form with medication selected", async ({ page }) => {
    await page.goto("/admin/record");

    // Select animal and medication
    await page.click('[data-testid="animal-select"]');
    await page.click('[data-testid="animal-option-buddy"]');
    await page.waitForTimeout(300);

    await page.click('[data-testid="medication-prednisone"]');
    await page.waitForTimeout(500);

    await takeVisualSnapshot(page, {
      name: "Admin Form Medication Selected",
      waitFor: ['[data-testid="dosage-inputs"]'],
    });
  });

  test("administration form with photo evidence", async ({ page }) => {
    await page.goto("/admin/record");

    // Set up form with basic info
    await page.click('[data-testid="animal-select"]');
    await page.click('[data-testid="animal-option-buddy"]');
    await page.click('[data-testid="medication-prednisone"]');
    await page.waitForTimeout(500);

    // Mock file upload
    const fileInput = page.locator('[data-testid="photo-upload"]');
    await fileInput.setInputFiles({
      name: "medication-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-data"),
    });

    await page.waitForTimeout(500);

    await takeVisualSnapshot(page, {
      name: "Admin Form With Photos",
      waitFor: ['[data-testid="photo-preview"]'],
    });
  });

  test("administration form complete", async ({ page }) => {
    await page.goto("/admin/record");

    await testComponentStates(page, "Admin Form", [
      {
        name: "Fully Completed",
        setup: async () => {
          // Fill complete form
          await page.click('[data-testid="animal-select"]');
          await page.click('[data-testid="animal-option-buddy"]');
          await page.click('[data-testid="medication-prednisone"]');

          await fillTestForm(page, {
            dosageGiven: "5",
            notes: "Given with food as instructed",
            administrationTime: "08:30",
          });

          // Add location
          await page.selectOption('[data-testid="location-select"]', "HOME");
        },
      },
    ]);
  });

  test("administration form responsive design", async ({ page }) => {
    await page.goto("/admin/record");

    // Set up some form data for better visual testing
    await page.click('[data-testid="animal-select"]');
    await page.click('[data-testid="animal-option-buddy"]');
    await page.click('[data-testid="medication-prednisone"]');

    await testResponsiveView(page, "Admin Form", {
      waitFor: ['[data-testid="admin-form"]'],
    });
  });

  test("administration success confirmation", async ({ page }) => {
    await page.goto("/admin/record");

    // Fill and submit form
    await page.click('[data-testid="animal-select"]');
    await page.click('[data-testid="animal-option-buddy"]');
    await page.click('[data-testid="medication-prednisone"]');

    await fillTestForm(page, {
      dosageGiven: "5",
    });

    // Mock successful submission
    await page.route(
      "**/api/trpc/admin.recordAdministration",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, id: "admin-123" }),
        });
      },
    );

    await page.click('[data-testid="submit-button"]');
    await page.waitForTimeout(1000);

    await takeVisualSnapshot(page, {
      name: "Admin Form Success State",
      waitFor: ['[data-testid="success-message"]'],
    });
  });

  test("administration form with overdue indicator", async ({ page }) => {
    // Mock overdue regimen
    await page.addInitScript(() => {
      (window as any).__TEST_REGIMENS__ = [
        {
          id: "overdue-regimen",
          animalId: "test-animal-123",
          medicationName: "Prednisone",
          dosage: "5mg",
          frequency: "TWICE_DAILY",
          nextDue: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          status: "OVERDUE",
        },
      ];
    });

    await page.goto("/admin/record");
    await page.click('[data-testid="animal-select"]');
    await page.click('[data-testid="animal-option-buddy"]');
    await page.waitForTimeout(500);

    await takeVisualSnapshot(page, {
      name: "Admin Form Overdue Medication",
      waitFor: ['[data-testid="overdue-indicator"]'],
    });
  });

  test("administration form validation states", async ({ page }) => {
    await page.goto("/admin/record");

    await testComponentStates(page, "Admin Form Validation", [
      {
        name: "Missing Required Fields",
        setup: async () => {
          // Try to submit without required fields
          await page.click('[data-testid="submit-button"]');
          await page.waitForTimeout(500);
        },
      },
      {
        name: "Invalid Dosage",
        setup: async () => {
          await page.click('[data-testid="animal-select"]');
          await page.click('[data-testid="animal-option-buddy"]');
          await page.click('[data-testid="medication-prednisone"]');
          await page.fill('[data-testid="dosage-given"]', "-5"); // Invalid negative dosage
          await page.click('[data-testid="submit-button"]');
          await page.waitForTimeout(500);
        },
      },
    ]);
  });

  test("bulk administration recording", async ({ page }) => {
    await page.goto("/admin/record");

    // Enable bulk mode if available
    const bulkToggle = page.locator('[data-testid="bulk-mode-toggle"]');
    if (await bulkToggle.isVisible()) {
      await bulkToggle.click();
      await page.waitForTimeout(500);

      await takeVisualSnapshot(page, {
        name: "Admin Form Bulk Mode",
        waitFor: ['[data-testid="bulk-admin-form"]'],
      });

      // Select multiple animals
      await page.click('[data-testid="bulk-select-buddy"]');
      await page.click('[data-testid="bulk-select-whiskers"]');
      await page.waitForTimeout(300);

      await takeVisualSnapshot(page, {
        name: "Admin Form Bulk Selection",
        waitFor: ['[data-testid="bulk-selected-animals"]'],
      });
    }
  });

  test("administration form dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/admin/record");

    await takeVisualSnapshot(page, {
      name: "Admin Form Dark Mode",
      waitFor: ['[data-testid="admin-form"]'],
    });
  });

  test("quick administration shortcuts", async ({ page }) => {
    await page.goto("/admin/record");

    // Test quick action buttons if available
    const quickActions = page.locator('[data-testid="quick-actions"]');
    if (await quickActions.isVisible()) {
      await takeVisualSnapshot(page, {
        name: "Admin Form Quick Actions",
        waitFor: ['[data-testid="quick-actions"]'],
      });
    }
  });

  test("administration form with different medication types", async ({
    page,
  }) => {
    // Mock different medication types
    await page.addInitScript(() => {
      (window as any).__TEST_MEDICATIONS__ = [
        {
          id: "tablet-med",
          name: "Prednisone",
          form: "TABLET",
          concentration: "5mg",
        },
        {
          id: "liquid-med",
          name: "Metacam",
          form: "LIQUID",
          concentration: "1.5mg/ml",
        },
        {
          id: "injection-med",
          name: "Insulin",
          form: "INJECTION",
          concentration: "100IU/ml",
        },
      ];
    });

    await page.goto("/admin/record");
    await page.click('[data-testid="animal-select"]');
    await page.click('[data-testid="animal-option-buddy"]');

    await testComponentStates(page, "Medication Types", [
      {
        name: "Tablet Medication",
        setup: async () => {
          await page.click('[data-testid="medication-tablet-med"]');
          await page.waitForTimeout(300);
        },
      },
      {
        name: "Liquid Medication",
        setup: async () => {
          await page.click('[data-testid="medication-liquid-med"]');
          await page.waitForTimeout(300);
        },
      },
      {
        name: "Injection Medication",
        setup: async () => {
          await page.click('[data-testid="medication-injection-med"]');
          await page.waitForTimeout(300);
        },
      },
    ]);
  });

  test("administration history timeline", async ({ page }) => {
    await page.goto("/admin/record");

    // View recent administrations sidebar/panel
    const historyToggle = page.locator('[data-testid="recent-history-toggle"]');
    if (await historyToggle.isVisible()) {
      await historyToggle.click();
      await page.waitForTimeout(500);

      await takeVisualSnapshot(page, {
        name: "Admin Form With History",
        waitFor: ['[data-testid="recent-history-panel"]'],
      });
    }
  });
});
