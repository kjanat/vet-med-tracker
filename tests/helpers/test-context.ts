import { vi } from "vitest";
import type { ClerkContext } from "@/server/api/trpc/clerk-init";

export function createTestContext(): ClerkContext {
	const mockDbUser = {
		id: "test-user-id",
		name: "Test User",
		clerkUserId: "clerk_test-user-id",
		email: "test@example.com",
		image: null,
		emailVerified: null,
		preferredTimezone: null,
		preferredPhoneNumber: null,
		onboardingComplete: false,
		onboardingCompletedAt: null,
		preferencesBackup: null,
		use24HourTime: false,
		temperatureUnit: "celsius" as const,
		weightUnit: "kg" as const,
		emailReminders: true,
		smsReminders: false,
		pushNotifications: true,
		reminderLeadTimeMinutes: 15,
		emergencyContactName: null,
		emergencyContactPhone: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	const mockClerkUser = {
		id: "clerk_test-user-id",
		emailAddresses: [{ emailAddress: "test@example.com" }],
		firstName: "Test",
		lastName: "User",
		username: "testuser",
		imageUrl: null,
		publicMetadata: {},
		unsafeMetadata: {},
	};

	return {
		db: {
			select: vi.fn().mockReturnValue({
				from: vi.fn().mockReturnValue({
					innerJoin: vi.fn().mockReturnValue({
						where: vi.fn().mockReturnValue({
							orderBy: vi.fn().mockResolvedValue([]),
						}),
					}),
				}),
			}),
			insert: vi.fn().mockReturnValue({
				values: vi.fn().mockReturnValue({
					returning: vi.fn().mockResolvedValue([]),
				}),
			}),
			update: vi.fn().mockReturnValue({
				set: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						returning: vi.fn().mockResolvedValue([]),
					}),
				}),
			}),
			delete: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue([]),
			}),
		} as any,
		auth: vi.fn().mockResolvedValue({ userId: "clerk_test-user-id" }) as any,
		clerkUser: mockClerkUser as any,
		dbUser: mockDbUser as any,
		headers: new Headers(),
		requestedHouseholdId: "test-household-id",
		currentHouseholdId: "test-household-id",
		currentMembership: {
			id: "test-membership-id",
			userId: "test-user-id",
			householdId: "test-household-id",
			role: "OWNER" as const,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		availableHouseholds: [
			{
				id: "test-household-id",
				name: "Test Household",
				timezone: "America/New_York",
				createdAt: new Date(),
				updatedAt: new Date(),
				membership: {
					id: "test-membership-id",
					userId: "test-user-id",
					householdId: "test-household-id",
					role: "OWNER" as const,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			},
		],
	};
}
