# Testing with Clerk Test Mode

This document explains how to use Clerk's test mode for testing authentication flows in VetMed Tracker.

## Overview

Clerk provides test mode credentials that work in all non-production environments. These allow us to test authentication flows without sending real emails or SMS messages.

## Test Credentials

### Test Emails
Any email with the `+clerk_test` subaddress is recognized as a test email:
- `your_email+clerk_test@example.com`
- No verification emails are sent
- Use verification code `424242`

### Test Phone Numbers
Test phone numbers follow the pattern `+15555550XXX` where XXX is between 100-199:
- `+15555550100` (default in our tests)
- No SMS messages are sent
- Use verification code `424242`

### Universal Verification Code
All test emails and phone numbers can be verified with: `424242`

## Using Test Utilities

### E2E Tests (Playwright)

```typescript
import { ClerkTestHelpers, TEST_USERS } from "../helpers/clerk-test-utils";

test("should sign in with test user", async ({ page }) => {
  await page.goto("/sign-in");
  await ClerkTestHelpers.signInWithTestUser(page, TEST_USERS.OWNER);
  await expect(page).toHaveURL(/\/dashboard/);
});
```

### Integration Tests (Vitest)

```typescript
import { ClerkMockHelpers, TEST_USERS } from "../helpers/clerk-test-utils";

it("should create test session", () => {
  const session = ClerkMockHelpers.createTestSession(TEST_USERS.CAREGIVER);
  expect(session.access.role).toBe("CAREGIVER");
});
```

## Predefined Test Users

We maintain consistent test user profiles:

- **OWNER**: `owner@vetmed.test+clerk_test`
- **CAREGIVER**: `caregiver@vetmed.test+clerk_test`  
- **VET_READONLY**: `vet@vetmed.test+clerk_test`

## Environment Variables

Set these in your `.env.local` for local testing:

```bash
TEST_EMAIL_PATTERN="test@example.com+clerk_test@example.com"
TEST_PHONE_NUMBER="+15555550100"
TEST_VERIFICATION_CODE="424242"
```

## Best Practices

1. **Consistent Test Data**: Always use the predefined TEST_USERS for consistency
2. **Cleanup**: Sign out users between tests to avoid state leakage
3. **Role Testing**: Test different user roles to ensure proper authorization
4. **Onboarding**: Test both new user onboarding and existing user flows

## Debugging

- Verify you're in a non-production environment (development/staging)
- Check that emails include the `+clerk_test` suffix
- Ensure phone numbers are in the valid test range (100-199)
- Use the universal verification code `424242`

## References

- [Clerk Test Mode Documentation](https://clerk.com/docs/testing/test-emails-and-phones)
- [VetMed Tracker Auth Setup](./AUTH_SETUP.md)