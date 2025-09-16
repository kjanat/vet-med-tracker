// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAuthenticatedContext,
  mockSession,
} from "@/tests/helpers/trpc-utils";
import { regimenRouter } from "./regimens";

type SelectOverrides = Partial<
  Record<
    "innerJoin" | "leftJoin" | "where" | "orderBy" | "limit",
    ReturnType<typeof vi.fn>
  >
>;

const createSelectMock = <T>(rows: T[], overrides: SelectOverrides = {}) =>
  ({
    from: vi.fn().mockReturnThis(),
    innerJoin: (overrides.innerJoin ?? vi.fn()).mockReturnThis(),
    leftJoin: overrides.leftJoin
      ? overrides.leftJoin.mockReturnThis()
      : vi.fn().mockReturnThis(),
    where: (overrides.where ?? vi.fn()).mockReturnThis(),
    orderBy: (overrides.orderBy ?? vi.fn()).mockReturnThis(),
    limit: (overrides.limit ?? vi.fn()).mockReturnThis(),
    execute: vi.fn().mockResolvedValue(rows),
  }) as unknown as {
    from: () => unknown;
    innerJoin: () => unknown;
    leftJoin: () => unknown;
    where: () => unknown;
    orderBy: () => unknown;
    limit: () => unknown;
    execute: () => Promise<T[]>;
  };

describe("regimenRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should list all regimens for a household", async () => {
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = regimenRouter.createCaller(ctx);

      const mockRegimens = [
        {
          regimen: {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            animalId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            medicationId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            scheduleType: "FIXED",
            timesLocal: ["08:00", "18:00"],
            active: true,
            startDate: "2025-01-01",
            endDate: null,
            cutoffMinutes: 240,
            highRisk: false,
            requiresCoSign: false,
            dose: "1 tablet",
            route: "oral",
            instructions: null,
            prnReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
          },
          animal: {
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            name: "Buddy",
            species: "dog",
            householdId: mockSession.access.householdId,
          },
          medication: {
            id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            genericName: "Amoxicillin",
            brandName: null,
            route: "oral",
            form: "tablet",
            strength: "250mg",
          },
        },
      ];

      vi.spyOn(ctx.db, "select").mockImplementation(() =>
        createSelectMock(mockRegimens),
      );

      const result = await caller.list({
        householdId: mockSession.access.householdId,
      });

      expect(result).toEqual(mockRegimens);
      expect(result).toHaveLength(1);
    });

    it("should filter by animalId if provided", async () => {
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = regimenRouter.createCaller(ctx);

      const whereSpy = vi.fn().mockReturnThis();
      vi.spyOn(ctx.db, "select").mockImplementation(() =>
        createSelectMock([], { where: whereSpy }),
      );

      await caller.list({
        householdId: mockSession.access.householdId,
        animalId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      });

      expect(whereSpy).toHaveBeenCalled();
    });
  });

  describe("listDue", () => {
    it("should list due medications", async () => {
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = regimenRouter.createCaller(ctx);

      const mockActiveRegimens = [
        {
          regimen: {
            id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            scheduleType: "FIXED",
            timesLocal: ["08:00", "18:00"],
            route: "oral",
            dose: "1 tablet",
            highRisk: false,
            requiresCoSign: false,
            instructions: null,
            prnReason: null,
            cutoffMinutes: 240,
          },
          animal: {
            id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
            name: "Buddy",
            species: "dog",
            photoUrl: null,
            timezone: "America/New_York",
          },
          medication: {
            genericName: "Amoxicillin",
            brandName: null,
            route: "oral",
            form: "tablet",
            strength: "250mg",
          },
          lastAdmin: null,
        },
      ];

      vi.spyOn(ctx.db, "select").mockImplementation(() =>
        createSelectMock(mockActiveRegimens, {
          leftJoin: vi.fn(),
        }),
      );

      const result = await caller.listDue({
        householdId: mockSession.access.householdId,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getById", () => {
    it("should get a single regimen by ID", async () => {
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = regimenRouter.createCaller(ctx);

      const mockRegimen = {
        regimen: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          animalId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          medicationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          scheduleType: "FIXED",
          timesLocal: ["08:00", "18:00"],
          active: true,
          startDate: "2025-01-01",
          endDate: null,
          cutoffMinutes: 240,
          highRisk: false,
          requiresCoSign: false,
          dose: "1 tablet",
          route: "oral",
          instructions: null,
          prnReason: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
        animal: {
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          name: "Buddy",
          species: "dog",
          householdId: mockSession.access.householdId,
        },
        medication: {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          genericName: "Amoxicillin",
          brandName: null,
          route: "oral",
          form: "tablet",
          strength: "250mg",
        },
      };

      vi.spyOn(ctx.db, "select").mockImplementation(() =>
        createSelectMock([mockRegimen], { limit: vi.fn() }),
      );

      const result = await caller.getById({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        householdId: mockSession.access.householdId,
      });

      expect(result).toEqual(mockRegimen);
    });

    it("should throw NOT_FOUND if regimen doesn't exist", async () => {
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = regimenRouter.createCaller(ctx);

      vi.spyOn(ctx.db, "select").mockImplementation(() =>
        createSelectMock([], { limit: vi.fn() }),
      );

      await expect(
        caller.getById({
          id: "00000000-0000-4000-8000-000000000000",
          householdId: mockSession.access.householdId,
        }),
      ).rejects.toThrow("NOT_FOUND");
    });
  });
});
