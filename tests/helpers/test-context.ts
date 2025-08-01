import { vi } from "vitest";
import type { Context } from "@/server/api/trpc/init";

export function createTestContext(): Context {
	const mockUser = {
		id: "test-user-id",
		email: "test@example.com",
		name: "Test User",
		image: null,
		emailVerified: null,
		createdAt: new Date(),
		updatedAt: new Date(),
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
		user: mockUser,
		session: {
			userId: "test-user-id",
			user: mockUser,
			householdMemberships: [
				{
					id: "test-membership-id",
					userId: "test-user-id",
					householdId: "test-household-id",
					role: "OWNER" as const,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			expiresAt: new Date(Date.now() + 3600000),
		},
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
	};
}
