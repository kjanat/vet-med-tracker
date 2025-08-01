import { vi } from "vitest";

export function createTestContext() {
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
		},
		user: {
			id: "test-user-id",
			email: "test@example.com",
		},
		session: {
			userId: "test-user-id",
		},
	};
}
