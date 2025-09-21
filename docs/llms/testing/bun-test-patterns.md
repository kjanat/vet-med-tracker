# Bun Test Patterns for VetMed Tracker

> [!WARNING]
> This is not official documentation, but llm-generated, don't over-rely on this.

## Overview

Specific patterns and best practices for testing with Bun test runner in the VetMed Tracker project.

## Bun Test Runner Advantages

### Performance Benefits

- **2x faster** than Jest for our test suite
- **Built-in coverage** without additional tooling
- **Native TypeScript** support without transpilation
- **Parallel execution** by default

### Features

- Compatible test syntax with Jest/Vitest
- Built-in mocking capabilities
- Coverage reporting integrated
- Watch mode for development

## Test Environment Setup

### HappyDOM Integration

Our `happydom.ts` file provides Jest compatibility:

```typescript
// happydom.ts - Test environment setup
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Jest compatibility layer
const createMockFn = (impl?: Function): MockFn => {
  const mockFn = ((...args: unknown[]) => impl?.(...args)) as MockFn;
  mockFn.mockClear = () => mockFn;
  mockFn.mockImplementation = (newImpl) => {
    impl = newImpl;
    return mockFn;
  };
  return mockFn;
};

// Register DOM globals
GlobalRegistrator.register();
```

### Import Patterns

```typescript
// Standard Bun test imports
import { describe, expect, it, beforeEach, afterEach } from "bun:test";

// For mocking
import { mock } from "bun:test";

// For React component testing
import { render, screen, fireEvent, act } from "@testing-library/react";
```

## Common Testing Patterns

### 1. Service Layer Testing

**Pattern**: Static method validation with business rules

```typescript
// lib/services/__tests__/inventoryFormValidator.test.ts
import { describe, expect, test } from "bun:test";
import { InventoryFormValidator } from "../inventoryFormValidator";

// Mock data factory
const createMockFormData = (overrides = {}) => ({
  medicationId: "med-123",
  name: "Test Medication",
  quantityUnits: 10,
  unitsRemaining: 8,
  expiresOn: new Date("2025-12-31"),
  ...overrides,
});

describe("InventoryFormValidator", () => {
  describe("validate()", () => {
    test("should pass validation with valid data", () => {
      const data = createMockFormData();
      const context = { householdId: "household-123" };

      const result = InventoryFormValidator.validate(data, context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should fail with missing required fields", () => {
      const data = createMockFormData({
        medicationId: "",
        name: ""
      });

      const result = InventoryFormValidator.validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "MISSING_MEDICATION")).toBe(true);
    });
  });
});
```

### 2. React Hook Testing

**Pattern**: State management and lifecycle testing

```typescript
// hooks/forms/__tests__/useAnimalFormState.test.ts
import { describe, expect, test, mock } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import { useAnimalFormState } from "../useAnimalFormState";

describe("useAnimalFormState", () => {
  test("should initialize with default state", () => {
    const { result } = renderHook(() => useAnimalFormState());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.editingAnimal).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test("should handle form opening", () => {
    const onOpen = mock(() => {});
    const { result } = renderHook(() =>
      useAnimalFormState({ onOpen })
    );

    act(() => {
      result.current.openForm();
    });

    expect(result.current.isOpen).toBe(true);
    expect(onOpen).toHaveBeenCalledWith(null);
  });

  test("should handle callback errors gracefully", () => {
    const throwingCallback = mock(() => {
      throw new Error("Callback error");
    });

    const { result } = renderHook(() =>
      useAnimalFormState({
        onClose: throwingCallback,
        initialState: { isOpen: true }
      })
    );

    expect(() => {
      act(() => {
        result.current.closeForm();
      });
    }).toThrow("Callback error");

    // State doesn't update when callback throws
    expect(result.current.isOpen).toBe(true);
  });
});
```

### 3. Component Testing

**Pattern**: UI behavior and user interaction testing

```typescript
// components/onboarding/__tests__/welcome-flow.test.tsx
import { describe, expect, test } from "bun:test";
import { render, screen, fireEvent } from "@testing-library/react";
import { WelcomeFlow } from "../welcome-flow";

describe("WelcomeFlow", () => {
  test("should render welcome message", () => {
    render(<WelcomeFlow />);

    expect(screen.getByText("Welcome to VetMed Tracker!"))
      .toBeInTheDocument();
  });

  test("should handle form submission", async () => {
    const onComplete = jest.fn();
    render(<WelcomeFlow onComplete={onComplete} />);

    const input = screen.getByLabelText(/household name/i);
    const nextButton = screen.getByRole("button", { name: /next/i });

    fireEvent.change(input, { target: { value: "Test Household" } });
    fireEvent.click(nextButton);

    expect(onComplete).toHaveBeenCalledWith({
      householdName: "Test Household"
    });
  });
});
```

### 4. Utility Function Testing

**Pattern**: Pure function testing with edge cases

```typescript
// tests/dosage-calculator.test.ts
import { describe, expect, test } from "bun:test";
import { calculateDosage, DosageUnit } from "@/lib/calculators/dosage";

describe("calculateDosage", () => {
  test("should calculate tablet dosage correctly", () => {
    const result = calculateDosage({
      weight: 25, // kg
      dosagePerKg: 10, // mg/kg
      medicationStrength: 250, // mg per tablet
      unit: DosageUnit.MG_PER_KG
    });

    expect(result.amount).toBe(1);
    expect(result.unit).toBe("tablet");
    expect(result.instructions).toContain("1 tablet");
  });

  test("should handle edge case with very small dosage", () => {
    const result = calculateDosage({
      weight: 2, // kg (small pet)
      dosagePerKg: 0.5, // mg/kg
      medicationStrength: 10, // mg per tablet
      unit: DosageUnit.MG_PER_KG
    });

    expect(result.amount).toBe(0.1);
    expect(result.unit).toBe("tablet");
    expect(result.warnings).toContain("Very small dosage");
  });
});
```

## Bun-Specific Features

### 1. Mock Function Usage

```typescript
import { mock } from "bun:test";

// Create mock function
const mockCallback = mock(() => {});

// Verify calls
expect(mockCallback).toHaveBeenCalledTimes(1);
expect(mockCallback).toHaveBeenCalledWith("expected", "arguments");

// Mock implementation
const mockWithReturn = mock(() => "mocked value");
```

### 2. Async Testing

```typescript
import { describe, expect, test } from "bun:test";

describe("async operations", () => {
  test("should handle async functions", async () => {
    const result = await someAsyncFunction();
    expect(result).toBe("expected");
  });

  test("should handle promises", () => {
    return expect(somePromise()).resolves.toBe("expected");
  });

  test("should handle rejections", () => {
    return expect(someRejectedPromise()).rejects.toThrow("error message");
  });
});
```

### 3. Timer Testing

```typescript
import { describe, expect, test } from "bun:test";

describe("timer operations", () => {
  test("should handle setTimeout", () => {
    const callback = mock();

    setTimeout(callback, 1000);

    // In Bun, we can't advance timers yet, so test differently
    expect(typeof callback).toBe("function");
  });
});
```

## Performance Optimizations

### 1. Test Organization

```typescript
// Group related tests for better performance
describe("FormValidator", () => {
  // Reuse expensive setup
  const expensiveSetup = createExpensiveTestData();

  describe("validation rules", () => {
    test("rule 1", () => {
      // Use shared setup
      const result = validator.validate(expensiveSetup.data1);
      expect(result).toBe(true);
    });

    test("rule 2", () => {
      // Use shared setup
      const result = validator.validate(expensiveSetup.data2);
      expect(result).toBe(false);
    });
  });
});
```

### 2. Mock Optimization

```typescript
// Expensive mock - create once
const heavyMock = mock(() => {
  // Expensive operation
  return processLargeDataset();
});

// Light mock - create per test
const lightMock = mock();
```

### 3. Resource Cleanup

```typescript
import { describe, expect, test, beforeEach, afterEach } from "bun:test";

describe("component with resources", () => {
  let cleanup: () => void;

  beforeEach(() => {
    // Setup
    cleanup = setupResources();
  });

  afterEach(() => {
    // Critical: Clean up resources
    cleanup?.();
  });

  test("should work with resources", () => {
    // Test implementation
  });
});
```

## Common Gotchas

### 1. Testing Library Matchers

Ensure proper setup for `toBeInTheDocument`:

```typescript
// Correct import for Bun
import { expect } from "bun:test";
import "@testing-library/jest-dom"; // Adds custom matchers

// Use in tests
expect(screen.getByText("Hello")).toBeInTheDocument();
```

### 2. Mock Function Compatibility

```typescript
// Bun mock syntax
import { mock } from "bun:test";
const mockFn = mock(() => {});

// NOT Jest syntax
// const mockFn = jest.fn();
```

### 3. Async Test Handling

```typescript
// Correct async test pattern
test("async operation", async () => {
  const result = await asyncFunction();
  expect(result).toBe("expected");
});

// NOT: Missing await
test("async operation", () => {
  const result = asyncFunction(); // Returns Promise
  expect(result).toBe("expected"); // Will fail
});
```

### 4. Component Testing Setup

```typescript
// Correct component test setup
import { render } from "@testing-library/react";

// Wrap with providers if needed
const renderWithProviders = (component: ReactElement) => {
  return render(
    <QueryProvider>
      <ThemeProvider>
        {component}
      </ThemeProvider>
    </QueryProvider>
  );
};
```

## Debug Patterns

### 1. Test Debugging

```typescript
test("debug test", () => {
  const data = createTestData();

  // Debug output
  console.log("Test data:", data);

  const result = functionUnderTest(data);

  // Debug result
  console.log("Result:", result);

  expect(result).toBe("expected");
});
```

### 2. Component Debugging

```typescript
test("debug component", () => {
  const { debug } = render(<MyComponent />);

  // Print DOM tree
  debug();

  // Or print specific element
  const element = screen.getByTestId("my-element");
  debug(element);
});
```

### 3. Test Isolation

```typescript
test.only("focus on this test", () => {
  // This test will run in isolation
});

test.skip("skip this test", () => {
  // This test will be skipped
});
```

## Coverage Optimization

### 1. Target High-Impact Code

```typescript
// Focus on business logic
describe("critical business logic", () => {
  test("edge case 1", () => {});
  test("edge case 2", () => {});
  test("error handling", () => {});
});
```

### 2. Coverage Commands

```bash
# Run with coverage
bun test --coverage

# Coverage for specific files
bun test path/to/tests --coverage

# HTML coverage report
bun test --coverage --coverage-reporter html
```

### 3. Coverage Thresholds

Aim for these coverage targets:

- **Business Logic**: 90%+
- **Utilities**: 95%+
- **Components**: 70%+
- **Integration**: 60%+

## Best Practices Summary

1. **Use factories** for consistent mock data
2. **Test edge cases** and error conditions
3. **Mock external dependencies** appropriately
4. **Keep tests focused** on single behaviors
5. **Use descriptive test names** that explain intent
6. **Clean up resources** in afterEach/afterAll
7. **Group related tests** for organization
8. **Optimize for performance** with shared setup
9. **Debug systematically** with console.log and debug()
10. **Target high-impact code** for coverage improvement
