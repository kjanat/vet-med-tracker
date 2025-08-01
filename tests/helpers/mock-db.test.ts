import { describe, expect, it } from "vitest";
import { mockDb, resetMockDb } from "./mock-db";

describe("mockDb", () => {
	it("should support chaining select operations", async () => {
		const result = await mockDb
			.select()
			.from("test")
			.where("test")
			.orderBy("test")
			.limit(10)
			.execute();

		expect(result).toEqual([]);
		expect(mockDb.select).toHaveBeenCalled();
	});

	it("should support mocking specific results", async () => {
		const expectedData = [{ id: 1, name: "test" }];

		mockDb.select.mockImplementationOnce(() => ({
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			execute: vi.fn().mockResolvedValue(expectedData),
		}));

		const result = await mockDb
			.select()
			.from("test")
			.where("test")
			.orderBy("test")
			.limit(10)
			.execute();

		expect(result).toEqual(expectedData);
	});

	it("should reset properly", () => {
		mockDb.select();
		expect(mockDb.select).toHaveBeenCalled();

		resetMockDb();
		expect(mockDb.select).not.toHaveBeenCalled();
	});
});
