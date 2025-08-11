/**
 * Stack Auth Mock System Tests
 * Comprehensive tests to ensure the mock system works correctly
 */

import { render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	AuthTestScenarios,
	renderWithAuth,
} from "../helpers/stack-auth-test-utils";
import {
	createMockSession,
	createMockStackServerApp,
	createMockUser,
	MockSignIn,
	MockSignUp,
	MockStackProvider,
	MockStackTheme,
	type MockStackUser,
	MockUserButton,
	StackAuthTestUtils,
	TEST_USERS,
} from "./stack-auth";

// Mock React components for testing
const TestComponent = () => {
	const mockUseUser = vi.fn(() => StackAuthTestUtils.getMockUser());
	const user = mockUseUser();

	return (
		<div>
			{user ? (
				<div data-testid="authenticated">
					<span data-testid="user-display-name">{user.displayName}</span>
					<span data-testid="user-email">{user.primaryEmail}</span>
				</div>
			) : (
				<div data-testid="unauthenticated">Please sign in</div>
			)}
		</div>
	);
};

describe("Stack Auth Mock System", () => {
	beforeEach(() => {
		StackAuthTestUtils.reset();
	});

	describe("User Factory Functions", () => {
		it("should create mock user with defaults", () => {
			const user = createMockUser();

			expect(user).toMatchObject({
				displayName: "Test User",
				primaryEmail: "testuser@example.com",
				primaryEmailVerified: true,
				hasPassword: true,
				oauthProviders: [],
				clientMetadata: expect.objectContaining({
					onboardingComplete: true,
					vetMedPreferences: expect.any(Object),
				}),
			});

			expect(user.id).toMatch(/^user_\d+_[a-z0-9]+$/);
			expect(typeof user.update).toBe("function");
			expect(typeof user.signOut).toBe("function");
			expect(typeof user.delete).toBe("function");
		});

		it("should create mock user with overrides", () => {
			const customUser = createMockUser({
				displayName: "Custom User",
				primaryEmail: "custom@test.com",
				clientMetadata: {
					customField: "customValue",
				},
			});

			expect(customUser.displayName).toBe("Custom User");
			expect(customUser.primaryEmail).toBe("custom@test.com");
			expect(customUser.clientMetadata).toMatchObject({
				onboardingComplete: true,
				vetMedPreferences: expect.any(Object),
				customField: "customValue",
			});
		});

		it("should create predefined test users", () => {
			expect(TEST_USERS.OWNER).toMatchObject({
				id: "user_owner_test",
				displayName: "Test Owner",
				primaryEmail: "owner@vetmed.test",
			});

			expect(TEST_USERS.CAREGIVER).toMatchObject({
				id: "user_caregiver_test",
				displayName: "Test Caregiver",
				primaryEmail: "caregiver@vetmed.test",
			});

			expect(TEST_USERS.VET_READONLY).toMatchObject({
				id: "user_vet_test",
				displayName: "Dr. Test Veterinarian",
				primaryEmail: "vet@vetmed.test",
			});
		});
	});

	describe("Mock Session Factory", () => {
		it("should create mock session for user", () => {
			const user = createMockUser();
			const session = createMockSession(user);

			expect(session.user).toBe(user);
			expect(session.accessToken).toBe(`mock_token_${user.id}`);
			expect(session.refreshToken).toBe(`mock_refresh_${user.id}`);
			expect(session.expiresAt).toBeInstanceOf(Date);
			expect(typeof session.refresh).toBe("function");
			expect(typeof session.revoke).toBe("function");
		});
	});

	describe("Mock Stack Server App", () => {
		it("should create server app with default user", async () => {
			const user = createMockUser();
			const serverApp = createMockStackServerApp(user);

			const result = await serverApp.getUser();
			expect(result).toBe(user);
		});

		it("should handle unauthenticated state", async () => {
			const serverApp = createMockStackServerApp(null);

			const result = await serverApp.getUser();
			expect(result).toBeNull();
		});

		it("should handle redirect option", async () => {
			const serverApp = createMockStackServerApp(null);

			await expect(serverApp.getUser({ or: "redirect" })).rejects.toThrow(
				"REDIRECT_TO_SIGNIN",
			);
		});

		it("should handle throw option", async () => {
			const serverApp = createMockStackServerApp(null);

			await expect(serverApp.getUser({ or: "throw" })).rejects.toThrow(
				"UNAUTHORIZED",
			);
		});

		it("should have correct URLs", () => {
			const serverApp = createMockStackServerApp();

			expect(serverApp.signInUrl).toBe("/handler/sign-in");
			expect(serverApp.signUpUrl).toBe("/handler/sign-up");
			expect(serverApp.signOutUrl).toBe("/handler/sign-out");
			expect(serverApp.accountSettingsUrl).toBe("/handler/account-settings");
		});
	});

	describe("StackAuthTestUtils", () => {
		it("should initialize with null user", () => {
			StackAuthTestUtils.initialize();
			expect(StackAuthTestUtils.getMockUser()).toBeNull();
		});

		it("should set and get mock user", () => {
			const user = createMockUser();
			StackAuthTestUtils.setMockUser(user);

			expect(StackAuthTestUtils.getMockUser()).toBe(user);
		});

		it("should sign in user", async () => {
			const user = await StackAuthTestUtils.signIn(TEST_USERS.OWNER);

			expect(StackAuthTestUtils.getMockUser()).toBe(user);
			expect(user).toBe(TEST_USERS.OWNER);
		});

		it("should sign out user", async () => {
			StackAuthTestUtils.setMockUser(TEST_USERS.OWNER);
			await StackAuthTestUtils.signOut();

			expect(StackAuthTestUtils.getMockUser()).toBeNull();
		});

		it("should reset state", () => {
			StackAuthTestUtils.setMockUser(TEST_USERS.OWNER);
			StackAuthTestUtils.reset();

			expect(StackAuthTestUtils.getMockUser()).toBeNull();
		});

		it("should execute callback with authenticated user", () => {
			const originalUser = StackAuthTestUtils.getMockUser();

			const result = StackAuthTestUtils.withAuthenticatedUser(
				TEST_USERS.CAREGIVER,
				() => {
					expect(StackAuthTestUtils.getMockUser()).toBe(TEST_USERS.CAREGIVER);
					return "success";
				},
			);

			expect(result).toBe("success");
			expect(StackAuthTestUtils.getMockUser()).toBe(originalUser);
		});

		it("should execute callback with unauthenticated user", () => {
			StackAuthTestUtils.setMockUser(TEST_USERS.OWNER);

			const result = StackAuthTestUtils.withUnauthenticatedUser(() => {
				expect(StackAuthTestUtils.getMockUser()).toBeNull();
				return "success";
			});

			expect(result).toBe("success");
			expect(StackAuthTestUtils.getMockUser()).toBe(TEST_USERS.OWNER);
		});
	});

	describe("React Component Mocks", () => {
		it("should render MockStackProvider", () => {
			render(
				<MockStackProvider>
					<div data-testid="child">Child content</div>
				</MockStackProvider>,
			);

			expect(screen.getByTestId("mock-stack-provider")).toBeInTheDocument();
			expect(screen.getByTestId("child")).toBeInTheDocument();
		});

		it("should render MockStackTheme", () => {
			render(
				<MockStackTheme>
					<div data-testid="child">Child content</div>
				</MockStackTheme>,
			);

			expect(screen.getByTestId("mock-stack-theme")).toBeInTheDocument();
			expect(screen.getByTestId("child")).toBeInTheDocument();
		});

		it("should render MockSignIn", () => {
			render(<MockSignIn />);

			expect(screen.getByTestId("mock-sign-in")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Sign In" }),
			).toBeInTheDocument();
		});

		it("should render MockSignUp", () => {
			render(<MockSignUp />);

			expect(screen.getByTestId("mock-sign-up")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("First Name")).toBeInTheDocument();
			expect(screen.getByPlaceholderText("Last Name")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Sign Up" }),
			).toBeInTheDocument();
		});

		it("should render MockUserButton with user", () => {
			const user = createMockUser({ displayName: "Test User" });

			render(<MockUserButton user={user} />);

			expect(screen.getByTestId("mock-user-button")).toBeInTheDocument();
			expect(screen.getByText("Test User")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Sign Out" }),
			).toBeInTheDocument();
		});

		it("should render MockUserButton without user", () => {
			render(<MockUserButton />);

			expect(screen.getByTestId("mock-user-button")).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Sign In" }),
			).toBeInTheDocument();
		});
	});

	describe("Test Helper Integration", () => {
		it("should render with authenticated user", () => {
			renderWithAuth(<TestComponent />, { user: TEST_USERS.OWNER });

			expect(screen.getByTestId("authenticated")).toBeInTheDocument();
			expect(screen.getByTestId("user-display-name")).toHaveTextContent(
				"Test Owner",
			);
			expect(screen.getByTestId("user-email")).toHaveTextContent(
				"owner@vetmed.test",
			);
		});

		it("should render with unauthenticated user", () => {
			renderWithAuth(<TestComponent />, { user: null });

			expect(screen.getByTestId("unauthenticated")).toBeInTheDocument();
			expect(screen.getByText("Please sign in")).toBeInTheDocument();
		});

		it("should work with test scenarios", () => {
			AuthTestScenarios.withOwner((user) => {
				expect(user).toBe(TEST_USERS.OWNER);
				expect(StackAuthTestUtils.getMockUser()).toBe(TEST_USERS.OWNER);
			});

			AuthTestScenarios.withUnauthenticated(() => {
				expect(StackAuthTestUtils.getMockUser()).toBeNull();
			});
		});
	});

	describe("Mock Functions", () => {
		it("should mock user methods correctly", async () => {
			const user = createMockUser();

			// Test update method
			await user.update({ displayName: "Updated Name" });
			expect(user.update).toHaveBeenCalledWith({ displayName: "Updated Name" });

			// Test signOut method
			await user.signOut();
			expect(user.signOut).toHaveBeenCalled();

			// Test delete method
			await user.delete();
			expect(user.delete).toHaveBeenCalled();
		});

		it("should mock session methods correctly", async () => {
			const user = createMockUser();
			const session = createMockSession(user);

			// Test refresh method
			await session.refresh();
			expect(session.refresh).toHaveBeenCalled();

			// Test revoke method
			await session.revoke();
			expect(session.revoke).toHaveBeenCalled();
		});
	});
});
