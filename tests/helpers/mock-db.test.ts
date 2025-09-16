import { describe, expect, it, vi } from "vitest";
import { mockDb, resetMockDb } from "./mock-db";

type SelectBuilderMock<T> = {
  from: () => SelectBuilderMock<T>;
  where: () => SelectBuilderMock<T>;
  leftJoin: () => SelectBuilderMock<T>;
  innerJoin: () => SelectBuilderMock<T>;
  orderBy: () => SelectBuilderMock<T>;
  limit: () => SelectBuilderMock<T>;
  offset: () => SelectBuilderMock<T>;
  execute: () => Promise<T>;
};

const createSelectBuilderMock = <T>(data: T): SelectBuilderMock<T> => {
  const builder: SelectBuilderMock<T> = {
    from: vi.fn(() => builder),
    where: vi.fn(() => builder),
    leftJoin: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    orderBy: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    offset: vi.fn(() => builder),
    execute: vi.fn(async () => data),
  };

  return builder;
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
