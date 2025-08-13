import { vi } from "vitest";

// Create a mock database object for unit tests
export const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  })),
  insert: vi.fn(() => ({
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue([]),
  })),
  update: vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue([]),
  })),
  delete: vi.fn(() => ({
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue([]),
  })),
  transaction: vi.fn((callback) => callback(mockDb)),
};

// Helper to reset all mock functions
export function resetMockDb() {
  Object.values(mockDb).forEach((mockFn) => {
    if (typeof mockFn === "function") {
      mockFn.mockClear();
    }
  });
}
