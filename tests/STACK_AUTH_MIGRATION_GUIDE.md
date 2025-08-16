# Stack Auth Migration Guide

This guide explains how to migrate existing Clerk-based tests to use the new Stack Auth mock system.

## Overview

The Stack Auth mock system provides comprehensive testing utilities that replicate Stack Auth's behavior in tests,
including:

- Mock user objects with realistic properties
- Mock hooks (`useUser`, `useStackApp`)
- Mock server app (`stackServerApp.getUser()`)
- Mock React components (`StackProvider`, `UserButton`, etc.)
- Test utilities for easy authentication state management
- Playwright helpers for E2E testing

## Quick Start

### 1. Import the Mock System

```typescript
// For unit/integration tests
import { 
  renderWithAuthenticatedUser,
  renderWithUnauthenticatedUser,
  AuthTestScenarios,
  TEST_USERS,
  StackAuthTestUtils,
} from "../helpers/stack-auth-test-utils";

// For Playwright E2E tests
import StackAuthPlaywrightHelpers from "../helpers/stack-auth-playwright";
```

### 2. Basic Component Testing

```typescript
// BEFORE (Clerk)
render(<MyComponent />, {
  wrapper: ({ children }) => (
    <ClerkProvider publishableKey="test">
      <MockClerkUser user={mockUser}>
        {children}
      </MockClerkUser>
    </ClerkProvider>
  ),
});

// AFTER (Stack Auth)
renderWithAuthenticatedUser(<MyComponent />, TEST_USERS.OWNER);
```

### 3. Test Different User Types

```typescript
// Test with different roles
AuthTestScenarios.withOwner((user) => {
  // Test logic for household owner
  expect(user.clientMetadata?.vetMedPreferences?.role).toBe("OWNER");
});

AuthTestScenarios.withCaregiver((user) => {
  // Test logic for caregiver
  expect(user.clientMetadata?.vetMedPreferences?.role).toBe("CAREGIVER");
});

AuthTestScenarios.withUnauthenticated(() => {
  // Test logic for unauthenticated user
  expect(StackAuthTestUtils.getMockUser()).toBeNull();
});
```

## Migration Patterns

### Component Tests

#### Before (Clerk)

```typescript
import { useUser } from "@clerk/nextjs";

const MyComponent = () => {
  const { user, isSignedIn } = useUser();
  
  if (!isSignedIn || !user) {
    return <div>Please sign in</div>;
  }
  
  return (
    <div>
      <h1>Hello, {user.firstName}!</h1>
      <p>{user.emailAddresses[0]?.emailAddress}</p>
    </div>
  );
};

// Test
it("should render user info", () => {
  const mockUser = {
    firstName: "John",
    emailAddresses: [{ emailAddress: "john@example.com" }],
  };
  
  render(<MyComponent />, { 
    wrapper: ClerkTestWrapper,
    user: mockUser 
  });
  
  expect(screen.getByText("Hello, John!")).toBeInTheDocument();
});
```

#### After (Stack Auth)

```typescript
import { useUser } from "@stackframe/stack";

const MyComponent = () => {
  const user = useUser();
  
  if (!user) {
    return <div>Please sign in</div>;
  }
  
  return (
    <div>
      <h1>Hello, {user.displayName}!</h1>
      <p>{user.primaryEmail}</p>
    </div>
  );
};

// Test
it("should render user info", () => {
  const customUser = createMockUser({
    displayName: "John Doe",
    primaryEmail: "john@example.com",
  });
  
  renderWithAuthenticatedUser(<MyComponent />, customUser);
  
  expect(screen.getByText("Hello, John Doe!")).toBeInTheDocument();
});
```

### Server-Side Tests

#### Before (Clerk)

```typescript
import { auth } from "@clerk/nextjs/server";

// In your API route or server component
const { userId } = auth();

// Test
it("should handle authenticated request", async () => {
  mockAuth({ userId: "user_123" });
  
  const result = await myServerFunction();
  expect(result.success).toBe(true);
});
```

#### After (Stack Auth)

```typescript
import { stackServerApp } from "@/stack";

// In your API route or server component
const user = await stackServerApp.getUser();

// Test
it("should handle authenticated request", async () => {
  mockServerAuth.authenticated(TEST_USERS.OWNER);
  
  const result = await myServerFunction();
  expect(result.success).toBe(true);
});
```

### tRPC Context Tests

#### Before (Clerk)

```typescript
const createMockContext = (userId?: string) => ({
  session: userId ? { userId } : null,
  currentUser: userId ? mockClerkUser : null,
});
```

#### After (Stack Auth)

```typescript
const createMockContext = (user?: MockStackUser) => 
  createAuthenticatedTRPCContext(user);
```

### Playwright E2E Tests

#### Before (Clerk)

```typescript
test("user can sign in", async ({ page }) => {
  await page.goto("/sign-in");
  await page.fill('input[name="identifier"]', "test@example.com");
  await page.fill('input[name="password"]', "password");
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard");
});
```

#### After (Stack Auth)

```typescript
test("user can sign in", async ({ page }) => {
  await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.OWNER);
  expect(page).toHaveURL(/\/dashboard/);
});

// Or using flows
test("owner can access admin features", async ({ page }) => {
  const flows = StackAuthPlaywrightHelpers.createAuthFlows(page);
  await flows.asOwner();
  
  await page.goto("/admin");
  await expect(page.getByText("Admin Panel")).toBeVisible();
});
```

## Mock Data Structure

### Stack Auth User Mock

```typescript
interface MockStackUser {
  id: string;
  displayName: string | null;
  primaryEmail: string | null;
  primaryEmailVerified: boolean;
  profileImageUrl: string | null;
  signedUpAtMillis: number;
  hasPassword: boolean;
  oauthProviders: string[];
  selectedTeamId: string | null;
  clientMetadata: Record<string, any>;
  clientReadOnlyMetadata: Record<string, any>;
  update: (data: Partial<MockStackUser>) => Promise<void>;
  signOut: () => Promise<void>;
  delete: () => Promise<void>;
}
```

### Pre-defined Test Users

```typescript
export const TEST_USERS = {
  OWNER: {
    id: "user_owner_test",
    displayName: "Test Owner", 
    primaryEmail: "owner@vetmed.test",
    clientMetadata: {
      vetMedPreferences: { role: "OWNER" }
    }
  },
  CAREGIVER: {
    id: "user_caregiver_test",
    displayName: "Test Caregiver",
    primaryEmail: "caregiver@vetmed.test", 
    clientMetadata: {
      vetMedPreferences: { role: "CAREGIVER" }
    }
  },
  VET_READONLY: {
    id: "user_vet_test",
    displayName: "Dr. Test Veterinarian",
    primaryEmail: "vet@vetmed.test",
    clientMetadata: {
      vetMedPreferences: { role: "VETREADONLY" }
    }
  },
};
```

## API Mapping

### Hooks

| Clerk        | Stack Auth      | Mock                            |
|--------------|-----------------|---------------------------------|
| `useUser()`  | `useUser()`     | Returns `MockStackUser \| null` |
| `useAuth()`  | `useStackApp()` | Returns mock app instance       |
| `useClerk()` | `useStackApp()` | Returns mock app instance       |

### Server Functions

| Clerk                | Stack Auth                                   | Mock                            |
|----------------------|----------------------------------------------|---------------------------------|
| `auth().userId`      | `stackServerApp.getUser()?.id`               | Returns mock user ID            |
| `currentUser()`      | `stackServerApp.getUser()`                   | Returns `MockStackUser \| null` |
| `redirectToSignIn()` | `stackServerApp.getUser({ or: "redirect" })` | Throws redirect error           |

### User Properties

| Clerk                                 | Stack Auth                      | Mock                              |
|---------------------------------------|---------------------------------|-----------------------------------|
| `user.firstName`                      | `user.displayName` (first part) | `mockUser.displayName`            |
| `user.lastName`                       | `user.displayName` (last part)  | `mockUser.displayName`            |
| `user.emailAddresses[0].emailAddress` | `user.primaryEmail`             | `mockUser.primaryEmail`           |
| `user.publicMetadata`                 | `user.clientReadOnlyMetadata`   | `mockUser.clientReadOnlyMetadata` |
| `user.unsafeMetadata`                 | `user.clientMetadata`           | `mockUser.clientMetadata`         |

## Migration Checklist

### 1. Update Imports

- [ ] Replace `@clerk/nextjs` imports with `@stackframe/stack`
- [ ] Update test helper imports to use Stack Auth mocks

### 2. Update Component Code

- [ ] Replace `useUser()` return destructuring: `{ user, isSignedIn }` → `user`
- [ ] Update user property access: `user.firstName` → `user.displayName`
- [ ] Update metadata access: `user.unsafeMetadata` → `user.clientMetadata`

### 3. Update Server Code

- [ ] Replace `auth().userId` with `stackServerApp.getUser()?.id`
- [ ] Replace `currentUser()` with `stackServerApp.getUser()`
- [ ] Update redirect patterns for protected routes

### 4. Update Tests

- [ ] Replace Clerk test wrappers with Stack Auth render helpers
- [ ] Update mock user data structure
- [ ] Replace Clerk-specific test utilities
- [ ] Update Playwright authentication helpers

### 5. Update tRPC Context

- [ ] Update context creation to use Stack Auth user
- [ ] Update procedure middleware for authentication
- [ ] Update session handling (Stack Auth doesn't use sessions)

## Common Issues & Solutions

### Issue: Tests failing with "useUser is not a function"

**Solution**: Ensure the Stack Auth mock is properly set up in your test setup file:

```typescript
// In tests/helpers/setup.ts
vi.mock("@stackframe/stack", () => ({
  useUser: () => StackAuthTestUtils.getMockUser(),
  // ... other mocks
}));
```

### Issue: Server-side tests not recognizing authenticated user

**Solution**: Use the server auth mock helper:

```typescript
import { mockServerAuth } from "../helpers/stack-auth-test-utils";

// Before test
mockServerAuth.authenticated(TEST_USERS.OWNER);
```

### Issue: Playwright tests not maintaining auth state

**Solution**: Use the Playwright helpers consistently:

```typescript
import StackAuthPlaywrightHelpers from "../helpers/stack-auth-playwright";

test.beforeEach(async ({ page }) => {
  await StackAuthPlaywrightHelpers.signIn(page, TEST_USERS.OWNER);
});
```

### Issue: User metadata not accessible in tests

**Solution**: Set up custom user with proper metadata:

```typescript
const userWithMetadata = createMockUser({
  clientMetadata: {
    onboardingComplete: true,
    vetMedPreferences: {
      defaultTimezone: "America/New_York",
    },
  },
});

renderWithAuthenticatedUser(<Component />, userWithMetadata);
```

## Best Practices

1. **Use Pre-defined Test Users**: Prefer `TEST_USERS.OWNER`, `TEST_USERS.CAREGIVER`, etc. for consistency
2. **Reset State Between Tests**: The mock system automatically resets, but call `StackAuthTestUtils.reset()` if needed
3. **Test Both Auth States**: Always test both authenticated and unauthenticated states
4. **Use Scenario Helpers**: Use `AuthTestScenarios.withOwner()` etc. for role-specific tests
5. **Mock Realistic Data**: Include proper metadata that matches your app's expectations
6. **Test User Actions**: Test `user.update()`, `user.signOut()`, etc. methods when used

## Examples

See the following files for complete examples:

- `/tests/examples/stack-auth-migration-example.test.ts` - Comprehensive migration examples
- `/tests/mocks/stack-auth.test.ts` - Mock system validation tests
- `/tests/helpers/stack-auth-test-utils.ts` - Available helper functions

## Getting Help

If you encounter issues during migration:

1. Check the mock system tests to understand expected behavior
2. Use `debugAuthState()` helper to inspect current auth state
3. Ensure all imports are updated from Clerk to Stack Auth
4. Verify test setup includes the Stack Auth mocks
5. Check that user property names are correctly mapped