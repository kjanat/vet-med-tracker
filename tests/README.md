# VetMed Tracker Test Suite

Comprehensive unit and integration test suite for the VetMed Tracker application.

## Overview

This test suite provides comprehensive coverage of all critical business logic, components, and API endpoints with a focus on:

- **Business Logic**: Dosage calculations, inventory management, medication scheduling
- **Components**: React components with user interactions and accessibility
- **Hooks**: Custom hooks for data fetching, state management, and offline functionality  
- **APIs**: tRPC procedures with authentication and authorization
- **Utilities**: Date handling, image compression, validation functions
- **Edge Cases**: Error handling, boundary conditions, and offline scenarios

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── components/         # React component tests
│   ├── hooks/              # Custom hook tests
│   ├── utils/              # Utility function tests
│   └── trpc/               # tRPC router tests
├── integration/            # Integration tests
├── helpers/                # Test utilities and fixtures
│   ├── test-fixtures.ts    # Mock data and test objects
│   ├── rtl-utils.tsx       # React Testing Library utilities
│   ├── trpc-utils.ts       # tRPC testing helpers
│   └── mock-db.ts          # Database mocking utilities
└── README.md               # This file
```

## Coverage Goals

- **Unit Tests**: 80% code coverage on business logic
- **Integration Tests**: 70% coverage on API endpoints
- **Component Tests**: Critical user interactions and accessibility
- **Edge Cases**: Error conditions and boundary values

## Key Test Categories

### 1. Dosage Calculator Tests (`lib/calculators/__tests__/dosage.test.ts`)

Comprehensive testing of veterinary dosage calculations:

- **Basic Calculations**: mg/kg dosing for different species
- **Species Adjustments**: Cat, bird, and other species-specific modifications
- **Breed Considerations**: MDR1 gene sensitivity, sighthound adjustments
- **Age Adjustments**: Pediatric and geriatric dosing modifications
- **Route Adjustments**: IV, oral, and other administration routes
- **Safety Validation**: Overdose detection, contraindication checking
- **Unit Conversions**: mg to mL, tablets, alternative formats
- **Edge Cases**: Missing data, invalid inputs, extreme values

**Example Test**:
```typescript
it("applies MDR1 gene adjustment for collies", () => {
  const result = DosageCalculator.calculate({
    animal: mockCollie,
    medication: mockMedicationWithAdjustments,
  });

  expect(result.dose).toBe(187.5); // 50% reduction
  expect(result.calculationMethod).toBe("breed_adjusted");
  expect(result.warnings).toContain("MDR1 gene sensitivity");
});
```

### 2. Component Tests (`tests/unit/components/`)

React component testing with user interactions:

- **DosageCalculator**: Form validation, calculation display, error handling
- **PhotoUploader**: File selection, upload progress, error states
- **Modal Components**: Opening, closing, form submission
- **Navigation**: Mobile menu, keyboard navigation
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

**Features Tested**:
- User interactions (click, type, select)
- Form validation and submission
- Loading and error states
- Responsive behavior
- Accessibility compliance

### 3. Hook Tests (`tests/unit/hooks/`)

Custom React hook testing:

- **useOfflineQueue**: Offline operation queueing and synchronization
- **usePhotoUpload**: Image compression, upload progress, error handling
- **useDaysOfSupply**: Inventory calculations, reorder notifications
- **useKeyboardShortcuts**: Keyboard event handling
- **useHistoryFilters**: Data filtering and search functionality

**Example Test**:
```typescript
it("calculates days of supply correctly for tablets", () => {
  const { result } = renderHook(() => 
    useDaysOfSupply({
      inventoryItemId: testInventoryItem.id,
      animalId: testAnimal.id,
    })
  );

  expect(result.current.daysOfSupply).toBe(15);
  expect(result.current.isLowStock).toBe(false);
});
```

### 4. tRPC Router Tests (`tests/unit/trpc/`)

API endpoint testing with authentication:

- **Admin Router**: Medication administration CRUD operations
- **Inventory Router**: Stock management and calculations
- **Animal Router**: Pet information management
- **Household Router**: Multi-tenancy and permissions
- **Authentication**: User sessions and authorization
- **Validation**: Input validation and error handling

**Security Features Tested**:
- Authentication requirements
- Household-based authorization
- Input validation and sanitization
- Idempotency key handling
- Rate limiting (in integration tests)

### 5. Utility Tests (`tests/unit/utils/`)

Pure function testing:

- **Date Utilities**: Timezone handling, dose scheduling, formatting
- **Image Compression**: File processing, size optimization, format conversion
- **Unit Conversions**: Weight, volume, and dosage conversions
- **Search Parameters**: URL handling and filtering
- **Validation**: Input sanitization and type checking

**Example Test**:
```typescript
it("converts UTC to specific timezone", () => {
  const utcDate = new Date("2023-06-15T12:00:00Z");
  const result = convertToTimezone(utcDate, "America/New_York");
  
  expect(result.toISOString()).toBe("2023-06-15T08:00:00.000Z");
});
```

## Test Utilities and Fixtures

### Test Fixtures (`tests/helpers/test-fixtures.ts`)

Pre-configured test data:

- **Animal Data**: Dogs, cats, exotic species with different ages/weights
- **Medication Data**: Various drugs with adjustments and contraindications
- **Household Data**: Users, memberships, and access controls
- **Administration Data**: Dose records with different statuses
- **Inventory Data**: Stock items with expiration and usage tracking

### React Testing Library Utils (`tests/helpers/rtl-utils.tsx`)

Enhanced RTL utilities:

- **renderWithProviders**: Automatic provider wrapping (tRPC, React Query, Auth)
- **Form Helpers**: `fillFormField`, `selectOption`, `clickButton`
- **File Upload**: `uploadFile` with mock file handling
- **Accessibility**: `checkAccessibility` with axe integration
- **Viewport**: `setMobileViewport`, `setDesktopViewport`
- **Performance**: `measureRenderTime` for performance testing

### tRPC Testing Utils (`tests/helpers/trpc-utils.ts`)

tRPC-specific testing utilities:

- **Mock Contexts**: Authenticated and unauthenticated contexts
- **Mock Procedures**: Pre-configured procedure responses
- **Error Handling**: Standard error response mocking
- **Role Testing**: Permission-based access testing
- **Transaction Mocking**: Database transaction simulation

## Running Tests

### Basic Test Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run in watch mode
pnpm test:watch

# Run specific test file
pnpm test dosage.test.ts

# Run tests for specific component
pnpm test PhotoUploader

# Run integration tests only
pnpm test:integration

# Run E2E tests
pnpm test:e2e
```

### Coverage Reports

Coverage reports are generated in `coverage/` directory:

- **HTML Report**: `coverage/index.html`
- **JSON Report**: `coverage/coverage-final.json`
- **Text Summary**: Console output during test runs

### Performance Testing

```bash
# Run tests with performance monitoring
pnpm test --reporter=verbose

# Measure test execution time
pnpm test --reporter=json > test-results.json
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)

- **Environment**: jsdom for DOM testing
- **Setup Files**: Global test setup and mocks
- **Coverage**: v8 provider with exclusions
- **Timeout**: 30s for database operations
- **Path Aliases**: Same as application (`@/`)

### Global Test Setup (`tests/helpers/setup.ts`)

- **DOM Mocking**: `matchMedia`, `IntersectionObserver`
- **Next.js Mocking**: Router, navigation hooks
- **Environment Variables**: Test-specific configuration
- **Cleanup**: Automatic cleanup after each test

## Best Practices

### Test Organization

1. **Descriptive Names**: Tests should clearly describe what they're testing
2. **Arrange-Act-Assert**: Follow AAA pattern for test structure
3. **Single Assertion Focus**: Each test should verify one specific behavior
4. **Edge Case Coverage**: Include boundary conditions and error scenarios

### Mocking Strategy

1. **Mock External Dependencies**: APIs, file system, timers
2. **Preserve Business Logic**: Don't mock the code under test
3. **Realistic Test Data**: Use fixtures that resemble real data
4. **Consistent Mocking**: Use same mocks across related tests

### Error Testing

1. **Network Failures**: Test offline scenarios and API failures
2. **Validation Errors**: Test invalid inputs and edge cases
3. **Permission Errors**: Test unauthorized access attempts
4. **Race Conditions**: Test concurrent operations and timing issues

### Performance Considerations

1. **Test Isolation**: Each test should be independent
2. **Mock Heavy Operations**: Image processing, database queries
3. **Parallel Execution**: Tests should be able to run concurrently
4. **Resource Cleanup**: Clean up mocks, timers, and event listeners

## Continuous Integration

Tests run automatically on:

- **Pull Requests**: Full test suite with coverage reporting
- **Main Branch**: Integration and E2E tests
- **Scheduled Runs**: Nightly full test suite with performance monitoring

### Quality Gates

- **Unit Tests**: Must pass with >80% coverage
- **Integration Tests**: Must pass with >70% coverage  
- **E2E Tests**: Must pass critical user workflows
- **Performance**: Tests must complete within time limits

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout for slow operations
2. **Mock Issues**: Ensure mocks are properly reset between tests
3. **DOM Errors**: Check jsdom environment and DOM mocking
4. **Async Issues**: Use proper async/await and `waitFor`

### Debug Commands

```bash
# Run single test with detailed output
pnpm test --verbose dosage.test.ts

# Debug test in Node.js debugger
node --inspect-brk ./node_modules/.bin/vitest dosage.test.ts

# Run tests with console logs
pnpm test --reporter=verbose --no-coverage
```

## Contributing

When adding new features:

1. **Write Tests First**: TDD approach for new functionality
2. **Update Fixtures**: Add new test data as needed
3. **Test Edge Cases**: Include boundary conditions and error scenarios  
4. **Verify Coverage**: Ensure coverage targets are met
5. **Document Tests**: Update this README for significant changes

### Test Review Checklist

- [ ] Tests cover happy path and error scenarios
- [ ] Mocks are realistic and properly configured
- [ ] Tests are isolated and don't depend on each other
- [ ] Coverage targets are maintained
- [ ] Performance is acceptable (<30s for full suite)
- [ ] Documentation is updated if needed