# Testing Strategy

This project follows a "no mocks" testing philosophy, focusing on integration and E2E tests that use real dependencies.

## Test Types

### 1. Integration Tests (`tests/integration/`)
- Use real PostgreSQL database
- Test tRPC routers with actual database operations
- Verify business logic with real data persistence
- Run in CI with PostgreSQL 17

### 2. E2E Tests (`tests/e2e/`)
- Use Playwright for browser automation
- Test complete user flows
- Verify offline functionality
- Test across multiple browsers and devices

## Running Tests

### Locally
```bash
# You need a PostgreSQL instance running locally
# Set TEST_DATABASE_URL or DATABASE_URL_UNPOOLED env var

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run all tests
pnpm test:all
```

### In CI
Tests run automatically on push/PR with:
- Real PostgreSQL 17 database
- Multiple browser environments
- Automatic test artifacts on failure

## Why No Mocks?

1. **Real behavior**: Tests verify actual database operations and API calls
2. **Less maintenance**: No mock data to keep in sync with schemas
3. **Higher confidence**: If tests pass, the app works with real infrastructure
4. **Simpler tests**: No complex mock setup or verification

## Test Database

Integration tests require a PostgreSQL database. In CI, this is provided automatically. Locally, you can:

1. Use your development database (tests will create/cleanup their own data)
2. Set up a dedicated test database
3. Use Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:17`

## Writing Tests

### Integration Test Example
```typescript
// Create real data in database
const [user] = await db.insert(schema.users).values(userData).returning();

// Call actual tRPC router
const result = await caller.create({
  householdId: household.id,
  animalId: animal.id,
  regimenId: regimen.id,
});

// Verify in database
const [saved] = await db.select().from(schema.administrations).where(eq(schema.administrations.id, result.id));
expect(saved).toBeDefined();
```

### E2E Test Example
```typescript
// Navigate to real app
await page.goto("/admin/record");

// Interact with real UI
await page.getByTestId("medication-card").click();

// Verify real results
await expect(page.getByText(/Recorded at/)).toBeVisible();
```