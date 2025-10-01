# End-to-End Testing with Playwright

This directory contains E2E tests for VetMed Tracker using Playwright.

## Setup

Playwright is already configured and ready to use. The configuration is in `playwright.config.ts` at the project root.

## Running Tests

### Run all tests (headless)
```bash
bun run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
bun run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
bun run test:e2e:headed
```

### Run tests in specific browser
```bash
bun run test:e2e:chromium
bun run test:e2e:firefox
```

### Run specific test file
```bash
bun run test:e2e landing.spec.ts
```

### Run tests matching a pattern
```bash
bun run test:e2e -g "should load"
```

## Test Files

- **`landing.spec.ts`** - Tests for the landing page, including:
  - Page load and title verification
  - Main heading and CTA visibility
  - Navigation to FAQ and Help pages
  - Accessibility checks
  - Responsive design on mobile

- **`auth.spec.ts`** - Tests for authentication flows:
  - Sign up CTA for unauthenticated users
  - Access to public pages without auth
  - Redirect to sign in for protected routes
  - Authentication state in navigation

- **`navigation.spec.ts`** - Tests for site navigation:
  - Public page navigation
  - Footer links
  - Browser back/forward functionality
  - Keyboard navigation accessibility
  - FAQ search functionality
  - Help center sections

## Writing New Tests

### Basic Test Structure
```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    await page.goto("/path");

    // Your test assertions
    await expect(page).toHaveTitle(/Expected Title/);
  });
});
```

### Best Practices

1. **Use semantic locators**: Prefer `getByRole`, `getByLabel`, `getByText` over CSS selectors
   ```typescript
   // Good
   await page.getByRole("button", { name: /submit/i });

   // Avoid
   await page.locator(".submit-button");
   ```

2. **Wait for elements properly**:
   ```typescript
   await expect(element).toBeVisible();
   await page.waitForURL(/expected-path/);
   ```

3. **Use descriptive test names**: Test names should clearly describe what they test
   ```typescript
   test("should display error message when form is invalid", ...)
   ```

4. **Group related tests**: Use `test.describe` to organize tests logically

5. **Keep tests independent**: Each test should be able to run on its own

## Test Configuration

The Playwright config includes:
- **Base URL**: `http://localhost:3000`
- **Auto dev server**: Starts dev server before tests (if not already running)
- **Browsers**: Chromium (Chrome) and Firefox
- **Retries**: 2 retries on CI, 0 locally
- **Trace**: Captured on first retry for debugging

## Debugging Tests

### Debug Mode
```bash
bun run test:e2e --debug
```

### View test report
```bash
npx playwright show-report
```

### Generate trace
Tests automatically generate traces on first retry. View them:
```bash
npx playwright show-trace path/to/trace.zip
```

## CI Integration

Tests are configured to run in CI with:
- Fail if `test.only` is found
- 2 retries for flaky tests
- Single worker (no parallel execution)
- HTML report generation

## Authentication Testing

Currently, auth tests verify:
- Redirect to sign-in for protected routes
- Public page accessibility
- CTA state based on auth status

**Note**: Full authentication testing requires:
1. Test user credentials
2. Stack Auth test mode or mocked authentication
3. Session management setup

These can be expanded once test authentication is configured.

## Mobile Testing

To test on mobile viewports:
```typescript
await page.setViewportSize({ width: 375, height: 667 });
```

Or uncomment mobile projects in `playwright.config.ts`:
```typescript
{
  name: 'Mobile Chrome',
  use: { ...devices['Pixel 5'] },
},
```

## Accessibility Testing

Tests include basic accessibility checks:
- Keyboard navigation
- Semantic HTML elements
- ARIA roles

For comprehensive accessibility testing, consider:
- [@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright)
- Manual WCAG compliance review

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors](https://playwright.dev/docs/selectors)
- [Debugging Tools](https://playwright.dev/docs/debug)
