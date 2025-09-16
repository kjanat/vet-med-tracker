import { describe, expect, it, vi } from "vitest";
import { mockDb, resetMockDb } from "./mock-db";

const createSelectBuilderMock = <T>(
  data: T,
): ReturnType<typeof mockDb.select> => {
  const builder: Record<string, unknown> = {};

  const chain = () => builder as ReturnType<typeof mockDb.select>;

  Object.assign(builder, {
    from: vi.fn(chain),
    where: vi.fn(chain),
    leftJoin: vi.fn(chain),
    innerJoin: vi.fn(chain),
    orderBy: vi.fn(chain),
    limit: vi.fn(chain),
    offset: vi.fn(chain),
    execute: vi.fn(async () => data),
  });

  return builder as ReturnType<typeof mockDb.select>;
};

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

    mockDb.select.mockImplementationOnce(() =>
      createSelectBuilderMock(expectedData),
    );

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
