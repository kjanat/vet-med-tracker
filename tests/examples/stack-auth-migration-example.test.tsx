/**
 * Stack Auth Migration Example
 * Shows how to migrate existing Clerk-based tests to Stack Auth
 */

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
	AuthTestScenarios,
	ClerkToStackMigrationHelpers,
	mockServerAuth,
	renderWithAuthenticatedUser,
	renderWithUnauthenticatedUser,
	TEST_USERS,
} from "../helpers/stack-auth-test-utils";
import { StackAuthTestUtils } from "../mocks/stack-auth";

// Example component that uses Stack Auth hooks
const UserProfile = () => {
	// In the real app, this would be: const user = useUser();
	// In tests, this is automatically mocked via the test setup
	const user = StackAuthTestUtils.getMockUser();

	if (!user) {
		return <div data-testid="sign-in-prompt">Please sign in</div>;
	}

	return (
		<div data-testid="user-profile">
			<h1>Profile for {user.displayName}</h1>
			<p data-testid="user-email">{user.primaryEmail}</p>
			<p data-testid="user-verified">
				{user.primaryEmailVerified ? "Verified" : "Unverified"}
			</p>
			{user.clientMetadata?.onboardingComplete && (
				<div data-testid="onboarding-complete">Onboarding complete</div>
			)}
		</div>
	);
};

describe("Stack Auth Migration Examples", () => {
	beforeEach(() => {
		// Reset auth state before each test
		StackAuthTestUtils.reset();
	});

	describe("Basic Component Testing", () => {
		it("should show user profile when authenticated", () => {
			renderWithAuthenticatedUser(<UserProfile />, TEST_USERS.OWNER);

			expect(screen.getByTestId("user-profile")).toBeInTheDocument();
			expect(screen.getByText("Profile for Test Owner")).toBeInTheDocument();
			expect(screen.getByTestId("user-email")).toHaveTextContent(
				"owner@vetmed.test",
			);
			expect(screen.getByTestId("user-verified")).toHaveTextContent("Verified");
			expect(screen.getByTestId("onboarding-complete")).toBeInTheDocument();
		});

		it("should show sign in prompt when unauthenticated", () => {
			renderWithUnauthenticatedUser(<UserProfile />);

			expect(screen.getByTestId("sign-in-prompt")).toBeInTheDocument();
			expect(screen.getByText("Please sign in")).toBeInTheDocument();
		});
	});

	describe("Test Scenarios", () => {
		it("should test with different user roles", () => {
			// Test with owner
			AuthTestScenarios.withOwner((user) => {
				expect(user.displayName).toBe("Test Owner");
				expect(user.clientMetadata?.vetMedPreferences?.role).toBe("OWNER");
			});

			// Test with caregiver
			AuthTestScenarios.withCaregiver((user) => {
				expect(user.displayName).toBe("Test Caregiver");
				expect(user.clientMetadata?.vetMedPreferences?.role).toBe("CAREGIVER");
			});

			// Test with vet
			AuthTestScenarios.withVet((user) => {
				expect(user.displayName).toBe("Dr. Test Veterinarian");
				expect(user.clientMetadata?.vetMedPreferences?.role).toBe(
					"VETREADONLY",
				);
			});
		});
	});

	describe("Server-Side Testing", () => {
		it("should handle authenticated server requests", async () => {
			// Mock authenticated user for server-side
			mockServerAuth.authenticated(TEST_USERS.OWNER);

			const serverApp = StackAuthTestUtils.getMockStackServerApp();
			const user = await serverApp.getUser();

			expect(user).toBeTruthy();
			expect(user?.id).toBe(TEST_USERS.OWNER.id);
		});

		it("should handle unauthenticated server requests", async () => {
			// Mock unauthenticated state for server-side
			mockServerAuth.unauthenticated();

			const serverApp = StackAuthTestUtils.getMockStackServerApp();
			const user = await serverApp.getUser();

			expect(user).toBeNull();
		});
	});

	describe("Migration Helpers", () => {
		it("should convert Clerk user to Stack Auth user", () => {
			// Simulated old Clerk user data
			const clerkUser = {
				id: "clerk_user_123",
				firstName: "John",
				lastName: "Doe",
				emailAddresses: [
					{
						emailAddress: "john@example.com",
						verification: { status: "complete" },
					},
				],
				publicMetadata: {
					onboardingComplete: true,
				},
				unsafeMetadata: {
					vetMedPreferences: {
						defaultTimezone: "America/Los_Angeles",
					},
				},
			};

			const stackUser =
				ClerkToStackMigrationHelpers.convertClerkUser(clerkUser);

			expect(stackUser.id).toBe("clerk_user_123");
			expect(stackUser.displayName).toBe("John Doe");
			expect(stackUser.primaryEmail).toBe("john@example.com");
			expect(stackUser.primaryEmailVerified).toBe(true);
			expect(stackUser.clientMetadata?.onboardingComplete).toBe(true);
			expect(stackUser.clientMetadata?.vetMedPreferences?.defaultTimezone).toBe(
				"America/Los_Angeles",
			);
		});
	});
});
