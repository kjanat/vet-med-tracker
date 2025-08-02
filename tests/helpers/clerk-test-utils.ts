/**
 * Clerk Test Mode Utilities
 * Utilities for testing with Clerk's test mode credentials
 * See: https://clerk.com/docs/testing/test-emails-and-phones
 */

export const CLERK_TEST_CONSTANTS = {
	// Test verification code that works for all test emails/phones
	VERIFICATION_CODE: "424242",

	// Test phone number pattern (last 3 digits can be 100-199)
	PHONE_NUMBER_PREFIX: "+155555501",

	// Test email suffix that makes any email a test email
	EMAIL_SUFFIX: "+clerk_test",
} as const;

/**
 * Generate a test email address that Clerk will recognize as a test email
 */
export function generateTestEmail(
	baseEmail: string = "test@example.com",
): string {
	const [localPart, domain] = baseEmail.split("@");
	return `${localPart}${CLERK_TEST_CONSTANTS.EMAIL_SUFFIX}@${domain}`;
}

/**
 * Generate a test phone number that Clerk will recognize as a test phone
 * @param suffix - Last 3 digits (must be between 100-199)
 */
export function generateTestPhone(suffix: number = 100): string {
	if (suffix < 100 || suffix > 199) {
		throw new Error("Test phone suffix must be between 100-199");
	}
	return `${CLERK_TEST_CONSTANTS.PHONE_NUMBER_PREFIX}${suffix}`;
}

/**
 * Test user profiles for consistent testing
 */
export const TEST_USERS = {
	OWNER: {
		email: generateTestEmail("owner@vetmed.test"),
		phone: generateTestPhone(100),
		firstName: "Test",
		lastName: "Owner",
		role: "OWNER" as const,
	},
	CAREGIVER: {
		email: generateTestEmail("caregiver@vetmed.test"),
		phone: generateTestPhone(101),
		firstName: "Test",
		lastName: "Caregiver",
		role: "CAREGIVER" as const,
	},
	VET_READONLY: {
		email: generateTestEmail("vet@vetmed.test"),
		phone: generateTestPhone(102),
		firstName: "Dr. Test",
		lastName: "Veterinarian",
		role: "VETREADONLY" as const,
	},
} as const;

/**
 * Playwright helpers for E2E testing with Clerk
 */
export const ClerkTestHelpers = {
	/**
	 * Fill in the sign-in form with test credentials
	 */
	async signInWithTestUser(
		page: any, // Playwright Page type
		user: (typeof TEST_USERS)[keyof typeof TEST_USERS] = TEST_USERS.OWNER,
	) {
		// Fill email
		await page.fill('input[name="identifier"]', user.email);
		await page.click('button[type="submit"]');

		// Fill verification code
		await page.fill(
			'input[name="code"]',
			CLERK_TEST_CONSTANTS.VERIFICATION_CODE,
		);
		await page.click('button[type="submit"]');

		// Wait for sign-in to complete
		await page.waitForURL(/\/dashboard|\/onboarding/);
	},

	/**
	 * Sign up a new test user
	 */
	async signUpWithTestUser(
		page: any, // Playwright Page type
		user: (typeof TEST_USERS)[keyof typeof TEST_USERS] = TEST_USERS.OWNER,
		password = "TestPassword123!",
	) {
		// Fill sign-up form
		await page.fill('input[name="firstName"]', user.firstName);
		await page.fill('input[name="lastName"]', user.lastName);
		await page.fill('input[name="emailAddress"]', user.email);
		await page.fill('input[name="password"]', password);
		await page.click('button[type="submit"]');

		// Verify email with test code
		await page.fill(
			'input[name="code"]',
			CLERK_TEST_CONSTANTS.VERIFICATION_CODE,
		);
		await page.click('button[type="submit"]');

		// Wait for sign-up to complete
		await page.waitForURL(/\/onboarding/);
	},

	/**
	 * Sign out the current user
	 */
	async signOut(page: any) {
		// Look for user menu or sign out button
		await page.click('[data-testid="user-menu"]');
		await page.click('text="Sign out"');

		// Wait for sign-out to complete
		await page.waitForURL(/\/sign-in|\/$/);
	},
} as const;

/**
 * Vitest helpers for unit/integration testing
 */
export const ClerkMockHelpers = {
	/**
	 * Create a mock Clerk user for testing
	 */
	createMockClerkUser(
		user: (typeof TEST_USERS)[keyof typeof TEST_USERS] = TEST_USERS.OWNER,
	) {
		return {
			id: `user_${Date.now()}`,
			firstName: user.firstName,
			lastName: user.lastName,
			emailAddresses: [{ emailAddress: user.email }],
			phoneNumbers: [{ phoneNumber: user.phone }],
			imageUrl: null,
			username: null,
			publicMetadata: {
				onboardingComplete: false,
			},
			unsafeMetadata: {
				vetMedPreferences: {
					defaultTimezone: "America/New_York",
				},
				householdSettings: {
					primaryHouseholdName: `${user.firstName} Household`,
				},
			},
		};
	},

	/**
	 * Create a test session for the mock user
	 */
	createTestSession(
		user: (typeof TEST_USERS)[keyof typeof TEST_USERS] = TEST_USERS.OWNER,
	) {
		return {
			subject: "11111111-1111-4111-8111-111111111111",
			access: {
				householdId: "22222222-2222-4222-8222-222222222222",
				role: user.role,
			},
			type: "access_token",
			exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
		};
	},
} as const;
