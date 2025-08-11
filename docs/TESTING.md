# VetMed Tracker Testing Documentation

## Overview

VetMed Tracker uses a comprehensive testing strategy with multiple layers:
- **Unit Tests**: Component and utility function testing with Vitest
- **Integration Tests**: API and database testing with Vitest
- **E2E Tests**: User flow testing with Playwright
- **Visual Regression**: UI consistency testing with Percy

## Test Stack

- **Vitest**: Unit and integration testing framework
- **Playwright**: End-to-end testing framework
- **React Testing Library**: Component testing utilities
- **Stack Auth Test Utilities**: Authentication mocking for tests
- **PostgreSQL**: Local database for integration tests
- **Percy**: Visual regression testing (optional)

## Running Tests

### Quick Commands

```bash
# Run all unit/integration tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run integration tests only
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run all tests (integration + E2E)
pnpm test:all
```

### Database Setup for Tests

Integration tests require a local PostgreSQL database:

```bash
# Initialize test database (first time only)
pnpm db:test:init

# Reset test database
pnpm db:test:reset

# Seed test database with sample data
pnpm db:test:seed

# Verify test database health
pnpm db:test:health
```

## Test Structure

### Directory Organization

```
tests/
├── unit/                    # Unit tests for components and utilities
│   ├── components/          # React component tests
│   └── utils/               # Utility function tests
├── integration/             # Integration tests for API and database
│   ├── admin-workflow.test.ts
│   ├── auth-context.test.ts
│   └── ...
├── e2e/                     # End-to-end tests with Playwright
│   ├── auth.spec.ts         # Authentication flows
│   ├── critical-paths.spec.ts
│   └── visual/              # Visual regression tests
├── helpers/                 # Test utilities and helpers
│   ├── db-utils.ts          # Database test utilities
│   ├── trpc-utils.ts        # tRPC test context helpers
│   └── stack-auth-playwright.ts  # Stack Auth E2E helpers
└── mocks/                   # Mock implementations
    ├── stack-auth.tsx       # Stack Auth mock for Vitest
    └── stack-auth-playwright.ts  # Stack Auth mock for Playwright
```

## Authentication Testing

### Stack Auth Mock System

The application uses Stack Auth for authentication. Tests use a comprehensive mock system:

#### For Vitest Tests (Unit/Integration)

```typescript
import { StackAuthTestUtils, TEST_USERS } from "@/tests/mocks/stack-auth";

// In your test
beforeEach(() => {
  StackAuthTestUtils.reset();
  StackAuthTestUtils.setCurrentUser(TEST_USERS.OWNER);
});

// Create authenticated context
const ctx = await createAuthenticatedContext({
  subject: TEST_USERS.OWNER.id,
  access: {
    householdId: "test-household-123",
    role: "OWNER",
  },
  type: "session_token",
  exp: Date.now() + 3600000,
});
```

#### For Playwright Tests (E2E)

```typescript
import StackAuthPlaywrightHelpers from "../helpers/stack-auth-playwright";
import { TEST_USERS } from "../mocks/stack-auth-playwright";

// Sign in a user
await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.OWNER);

// Sign out
await StackAuthPlaywrightHelpers.signOut(page);

// Test protected routes
await StackAuthPlaywrightHelpers.testProtectedRoute(page, "/dashboard");

// Verify authentication state
await StackAuthPlaywrightHelpers.expectAuthenticated(page, TEST_USERS.OWNER);
```

### Test Users

Three test users are available with different roles:

- **OWNER**: Full access to household management
- **CAREGIVER**: Can administer medications and view data
- **VET_READONLY**: Read-only access to medical records

## Database Testing

### Local PostgreSQL Configuration

Integration tests use a local PostgreSQL database instead of Neon serverless:

```typescript
// tests/helpers/test-db-setup.ts
const testConfig = {
  host: process.env.TEST_DB_HOST || "localhost",
  port: parseInt(process.env.TEST_DB_PORT || "5432"),
  database: process.env.TEST_DB_NAME || "vetmed_test",
  user: process.env.TEST_DB_USER || "postgres",
  password: process.env.TEST_DB_PASSWORD || "postgres",
};
```

### Test Data Seeding

```typescript
import { seedTestData } from "@/tests/helpers/db-utils";

// In your test
const testData = await seedTestData();
// Returns: { user, household, animal, membership }
```

### Database Cleanup

Tests automatically clean up after themselves:

```typescript
import { setupTestDatabase } from "@/tests/helpers/db-utils";

describe("My Test Suite", () => {
  setupTestDatabase(); // Handles setup and teardown
  
  // Your tests here
});
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnimalCard } from "@/components/animals/animal-card";

describe("AnimalCard", () => {
  it("should display animal name", () => {
    const animal = {
      id: "123",
      name: "Buddy",
      species: "dog",
    };
    
    render(<AnimalCard animal={animal} />);
    
    expect(screen.getByText("Buddy")).toBeInTheDocument();
  });
});
```

### Integration Test Example

```typescript
import { describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/routers/_app";
import { createAuthenticatedContext } from "@/tests/helpers/trpc-utils";

describe("Animal API", () => {
  it("should create an animal", async () => {
    const ctx = await createAuthenticatedContext(mockSession);
    const caller = appRouter.createCaller(ctx);
    
    const animal = await caller.animal.create({
      householdId: "test-household",
      name: "Buddy",
      species: "dog",
    });
    
    expect(animal.name).toBe("Buddy");
  });
});
```

### E2E Test Example

```typescript
import { test, expect } from "@playwright/test";
import StackAuthPlaywrightHelpers from "../helpers/stack-auth-playwright";

test("should record medication", async ({ page }) => {
  // Sign in
  await StackAuthPlaywrightHelpers.signIn(page);
  
  // Navigate to medications
  await page.goto("/manage");
  
  // Record administration
  await page.click('[data-testid="record-admin-btn"]');
  await page.fill('[name="notes"]', "Given with food");
  await page.click('[type="submit"]');
  
  // Verify success
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests (all tests)
- Main branch pushes (integration + E2E)
- Nightly schedule (full test suite with visual regression)

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    pnpm test:integration
    pnpm test:e2e
```

## Debugging Tests

### Vitest UI

```bash
# Launch interactive test UI
pnpm test:ui
```

### Playwright Inspector

```bash
# Run E2E tests with inspector
pnpm test:e2e --debug

# Run specific test file
pnpm test:e2e tests/e2e/auth.spec.ts

# Run with headed browser
pnpm test:e2e --headed
```

### Test Reports

```bash
# View last E2E test report
pnpm exec playwright show-report

# Generate coverage report
pnpm test:coverage
# Open coverage/index.html in browser
```

## Performance Testing

### Lighthouse CI

```bash
# Run performance audit
pnpm lighthouse

# Run with CI configuration
pnpm lighthouse:ci
```

### Bundle Size

```bash
# Check bundle size
pnpm bundle:size
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Mock External Services**: Use mocks for Stack Auth, Redis, and external APIs
3. **Use Test IDs**: Add `data-testid` attributes for E2E test selectors
4. **Clean Up**: Always clean up test data after tests complete
5. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
6. **Arrange-Act-Assert**: Follow the AAA pattern in test structure
7. **Fast Feedback**: Keep unit tests fast, move slow tests to integration/E2E layers

## Common Issues

### PostgreSQL Connection Error

**Problem**: Integration tests fail with connection error
**Solution**: Ensure PostgreSQL is running locally:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
net start postgresql
```

### Stack Auth Mock Not Working

**Problem**: Authentication tests fail
**Solution**: Ensure mock is properly initialized:
```typescript
beforeEach(() => {
  StackAuthTestUtils.reset();
});
```

### E2E Tests Timeout

**Problem**: Playwright tests timeout
**Solution**: Increase timeout or check if dev server is running:
```typescript
test.setTimeout(60000); // 60 seconds
```

### Database Schema Out of Sync

**Problem**: Test database schema doesn't match application
**Solution**: Reset and migrate test database:
```bash
pnpm db:test:reset
pnpm db:test:init
```

## Contributing

When adding new features:
1. Write unit tests for utilities and components
2. Write integration tests for API endpoints
3. Write E2E tests for critical user flows
4. Update this documentation if test patterns change

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Stack Auth Documentation](https://stack-auth.com/docs)