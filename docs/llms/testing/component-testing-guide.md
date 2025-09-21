# Component Testing Guide for VetMed Tracker

> [!WARNING]
> This is not official documentation, but llm-generated, don't over-rely on this.

## Overview

Comprehensive guide for testing React components in the VetMed Tracker application using React Testing Library and Bun test runner.

## Component Testing Philosophy

### Testing Principles

1. **Test behavior, not implementation**
2. **Test user interactions**
3. **Test accessibility requirements**
4. **Test error states and edge cases**
5. **Test responsive behavior**

### What to Test

- **Rendering**: Component displays correct content
- **User Interactions**: Clicks, form inputs, keyboard navigation
- **Props**: Component responds to different prop values
- **State Changes**: UI updates based on state
- **Error Handling**: Graceful error display
- **Accessibility**: ARIA labels, keyboard navigation

### What NOT to Test

- **Implementation details**: Internal state, class names
- **Third-party libraries**: React Router, Radix UI internals
- **CSS styling**: Use visual regression tests instead
- **Complex business logic**: Test in service layer

## Setup and Environment

### Test File Structure

```text
components/
├── auth/
│   ├── login-button.tsx
│   └── __tests__/
│       └── login-button.test.tsx
├── forms/
│   ├── animal-form.tsx
│   └── __tests__/
│       └── animal-form.test.tsx
└── ui/
    ├── button.tsx
    └── __tests__/
        └── button.test.tsx
```

### Import Patterns

```typescript
// Essential test imports
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

// Component under test
import { MyComponent } from "../my-component";

// Test utilities
import { createMockProps, renderWithProviders } from "@/test-utils";
```

### Provider Wrapper Setup

```typescript
// test-utils/render-with-providers.tsx
import { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/providers/theme-provider";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

export const renderWithProviders = (ui: ReactElement) => {
  const testQueryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={testQueryClient}>
      <ThemeProvider defaultTheme="light">
        {ui}
      </ThemeProvider>
    </QueryClientProvider>
  );
};
```

## Component Testing Patterns

### 1. Basic Component Rendering

```typescript
// components/ui/__tests__/button.test.tsx
import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { Button } from "../button";

describe("Button", () => {
  test("should render with text", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole("button", { name: "Click me" }))
      .toBeInTheDocument();
  });

  test("should render different variants", () => {
    const { rerender } = render(<Button variant="default">Default</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary");

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");
  });

  test("should handle disabled state", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-disabled", "true");
  });
});
```

### 2. Form Component Testing

```typescript
// components/forms/__tests__/animal-form.test.tsx
import { describe, expect, test, mock } from "bun:test";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnimalForm } from "../animal-form";
import { renderWithProviders } from "@/test-utils";

const createMockProps = (overrides = {}) => ({
  onSubmit: mock(),
  onCancel: mock(),
  initialData: null,
  ...overrides,
});

describe("AnimalForm", () => {
  test("should render all form fields", () => {
    const props = createMockProps();
    renderWithProviders(<AnimalForm {...props} />);

    expect(screen.getByLabelText(/pet name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/species/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/breed/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/birth date/i)).toBeInTheDocument();
  });

  test("should handle form submission", async () => {
    const user = userEvent.setup();
    const mockSubmit = mock();
    const props = createMockProps({ onSubmit: mockSubmit });

    renderWithProviders(<AnimalForm {...props} />);

    // Fill form
    await user.type(screen.getByLabelText(/pet name/i), "Buddy");
    await user.selectOptions(screen.getByLabelText(/species/i), "Dog");
    await user.type(screen.getByLabelText(/breed/i), "Golden Retriever");
    await user.type(screen.getByLabelText(/weight/i), "25");

    // Submit
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        name: "Buddy",
        species: "Dog",
        breed: "Golden Retriever",
        weight: 25,
      });
    });
  });

  test("should show validation errors", async () => {
    const user = userEvent.setup();
    const props = createMockProps();

    renderWithProviders(<AnimalForm {...props} />);

    // Submit empty form
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/pet name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/species is required/i)).toBeInTheDocument();
    });
  });

  test("should prefill form in edit mode", () => {
    const initialData = {
      name: "Existing Pet",
      species: "Cat",
      breed: "Persian",
      weight: 15,
    };
    const props = createMockProps({ initialData });

    renderWithProviders(<AnimalForm {...props} />);

    expect(screen.getByDisplayValue("Existing Pet")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Persian")).toBeInTheDocument();
    expect(screen.getByDisplayValue("15")).toBeInTheDocument();
  });
});
```

### 3. Complex Component Testing

```typescript
// components/onboarding/__tests__/welcome-flow.test.tsx
import { describe, expect, test, mock } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeFlow } from "../welcome-flow";
import { renderWithProviders } from "@/test-utils";

describe("WelcomeFlow", () => {
  test("should navigate through steps", async () => {
    const user = userEvent.setup();
    const onComplete = mock();

    renderWithProviders(<WelcomeFlow onComplete={onComplete} />);

    // Step 1: Household setup
    expect(screen.getByText("Welcome to VetMed Tracker!")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/household name/i),
      "Test Household"
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 2: Profile setup
    expect(screen.getByText(/profile preferences/i)).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText(/timezone/i),
      "America/New_York"
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 3: Completion
    expect(screen.getByText(/setup complete/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /finish/i }));

    expect(onComplete).toHaveBeenCalledWith({
      householdName: "Test Household",
      timezone: "America/New_York",
    });
  });

  test("should handle step validation", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WelcomeFlow />);

    // Try to proceed without filling required field
    const nextButton = screen.getByRole("button", { name: /next/i });
    await user.click(nextButton);

    // Should stay on same step with error
    expect(screen.getByText("Welcome to VetMed Tracker!")).toBeInTheDocument();
    expect(screen.getByText(/household name is required/i)).toBeInTheDocument();
  });

  test("should allow going back", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WelcomeFlow />);

    // Navigate to step 2
    await user.type(
      screen.getByLabelText(/household name/i),
      "Test"
    );
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/profile preferences/i)).toBeInTheDocument();

    // Go back
    await user.click(screen.getByRole("button", { name: /previous/i }));

    expect(screen.getByText("Welcome to VetMed Tracker!")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
  });
});
```

### 4. Modal/Dialog Testing

```typescript
// components/ui/__tests__/dialog.test.tsx
import { describe, expect, test, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogContent, DialogTrigger } from "../dialog";

describe("Dialog", () => {
  test("should open dialog on trigger click", async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <h2>Dialog Content</h2>
          <p>This is dialog content</p>
        </DialogContent>
      </Dialog>
    );

    // Dialog should not be visible initially
    expect(screen.queryByText("Dialog Content")).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByRole("button", { name: "Open Dialog" }));

    // Dialog should be visible
    expect(screen.getByText("Dialog Content")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("should close dialog on escape key", async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen>
        <DialogContent>
          <h2>Dialog Content</h2>
        </DialogContent>
      </Dialog>
    );

    expect(screen.getByText("Dialog Content")).toBeInTheDocument();

    // Press escape
    await user.keyboard("{Escape}");

    expect(screen.queryByText("Dialog Content")).not.toBeInTheDocument();
  });

  test("should focus trap within dialog", async () => {
    const user = userEvent.setup();

    render(
      <Dialog defaultOpen>
        <DialogContent>
          <button>First Button</button>
          <button>Second Button</button>
          <button>Third Button</button>
        </DialogContent>
      </Dialog>
    );

    const firstButton = screen.getByRole("button", { name: "First Button" });
    const thirdButton = screen.getByRole("button", { name: "Third Button" });

    // Focus should start on first focusable element
    expect(firstButton).toHaveFocus();

    // Tab to last element
    await user.tab();
    await user.tab();
    expect(thirdButton).toHaveFocus();

    // Tab should wrap to first element
    await user.tab();
    expect(firstButton).toHaveFocus();
  });
});
```

## Accessibility Testing

### ARIA Testing

```typescript
test("should have proper ARIA attributes", () => {
  render(<MyComponent />);

  const element = screen.getByRole("button");
  expect(element).toHaveAttribute("aria-label", "Expected label");
  expect(element).toHaveAttribute("aria-describedby", "help-text");
});
```

### Keyboard Navigation

```typescript
test("should handle keyboard navigation", async () => {
  const user = userEvent.setup();
  render(<NavigationMenu />);

  // Tab through elements
  await user.tab();
  expect(screen.getByRole("menuitem", { name: "Home" })).toHaveFocus();

  await user.tab();
  expect(screen.getByRole("menuitem", { name: "About" })).toHaveFocus();

  // Arrow key navigation
  await user.keyboard("{ArrowDown}");
  expect(screen.getByRole("menuitem", { name: "Contact" })).toHaveFocus();
});
```

### Screen Reader Testing

```typescript
test("should provide screen reader friendly content", () => {
  render(<DataTable data={mockData} />);

  // Check for proper table structure
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  expect(screen.getAllByRole("row")).toHaveLength(6); // 1 header + 5 data rows

  // Check for descriptive content
  expect(screen.getByText("5 animals in household")).toBeInTheDocument();
});
```

## Error Boundary Testing

```typescript
// components/__tests__/error-boundary.test.tsx
import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "../error-boundary";

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

describe("ErrorBoundary", () => {
  test("should catch and display error", () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("No error")).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  test("should render children when no error", () => {
    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });
});
```

## Async Component Testing

### Loading States

```typescript
test("should show loading state", async () => {
  const mockFetch = jest.fn(() =>
    new Promise(resolve => setTimeout(resolve, 100))
  );

  render(<AsyncComponent fetchData={mockFetch} />);

  // Should show loading initially
  expect(screen.getByText("Loading...")).toBeInTheDocument();

  // Wait for loading to complete
  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  // Should show content
  expect(screen.getByText("Data loaded")).toBeInTheDocument();
});
```

### Error States

```typescript
test("should handle fetch errors", async () => {
  const mockFetch = jest.fn(() =>
    Promise.reject(new Error("Failed to fetch"))
  );

  render(<AsyncComponent fetchData={mockFetch} />);

  await waitFor(() => {
    expect(screen.getByText("Error: Failed to fetch")).toBeInTheDocument();
  });
});
```

## Component Testing Utilities

### Custom Render Helper

```typescript
// test-utils/custom-render.ts
import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { AllProviders } from "./all-providers";

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
```

### Mock Data Factories

```typescript
// test-utils/factories.ts
export const createMockAnimal = (overrides = {}) => ({
  id: "animal-123",
  name: "Test Pet",
  species: "Dog",
  breed: "Golden Retriever",
  weight: 25,
  birthDate: new Date("2020-01-01"),
  householdId: "household-123",
  ...overrides,
});

export const createMockUser = (overrides = {}) => ({
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  role: "owner",
  ...overrides,
});
```

### Wait Utilities

```typescript
// test-utils/wait-utilities.ts
import { waitFor } from "@testing-library/react";

export const waitForElementToBeRemoved = (element: HTMLElement) =>
  waitFor(() => expect(element).not.toBeInTheDocument());

export const waitForLoadingToFinish = () =>
  waitFor(() =>
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument()
  );
```

## Performance Testing

### Component Render Performance

```typescript
test("should render efficiently", () => {
  const start = performance.now();

  render(<ComplexComponent data={largeDataSet} />);

  const renderTime = performance.now() - start;
  expect(renderTime).toBeLessThan(100); // 100ms threshold
});
```

### Memory Leak Detection

```typescript
describe("Component cleanup", () => {
  test("should cleanup event listeners", () => {
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = render(<ComponentWithListeners />);

    expect(addEventListenerSpy).toHaveBeenCalled();

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledTimes(
      addEventListenerSpy.mock.calls.length
    );
  });
});
```

## Common Testing Pitfalls

### 1. Testing Implementation Details

```typescript
// ❌ Bad: Testing internal state
expect(component.state.isLoading).toBe(true);

// ✅ Good: Testing user-visible behavior
expect(screen.getByText("Loading...")).toBeInTheDocument();
```

### 2. Not Waiting for Async Updates

```typescript
// ❌ Bad: Not waiting for state update
fireEvent.click(button);
expect(screen.getByText("Success")).toBeInTheDocument();

// ✅ Good: Waiting for async update
fireEvent.click(button);
await waitFor(() => {
  expect(screen.getByText("Success")).toBeInTheDocument();
});
```

### 3. Overly Specific Selectors

```typescript
// ❌ Bad: Too specific
expect(screen.getByTestId("button-submit-form-animal")).toBeInTheDocument();

// ✅ Good: Semantic selector
expect(screen.getByRole("button", { name: /save animal/i })).toBeInTheDocument();
```

### 4. Not Cleaning Up

```typescript
// ❌ Bad: Leaking mocks
const mockFn = jest.fn();

// ✅ Good: Proper cleanup
afterEach(() => {
  jest.clearAllMocks();
});
```

## Best Practices Summary

1. **Use semantic queries**: `getByRole`, `getByLabelText`, `getByText`
2. **Test user interactions**: Click, type, submit, navigate
3. **Wait for async updates**: Use `waitFor` and `act`
4. **Mock external dependencies**: APIs, complex components
5. **Test error states**: Network failures, validation errors
6. **Test accessibility**: ARIA, keyboard navigation, screen readers
7. **Keep tests focused**: One behavior per test
8. **Use descriptive names**: Test intent should be clear
9. **Clean up properly**: Mocks, timers, event listeners
10. **Test edge cases**: Empty data, loading states, permissions
