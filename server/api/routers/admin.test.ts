import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDb, resetMockDb } from "@/tests/helpers/mock-db";
import {
  createAuthenticatedContext,
  createMockContext,
  mockSession,
} from "@/tests/helpers/trpc-utils";
import { adminRouter } from "./admin";

describe("adminRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb();
  });

  describe("create", () => {
    it("should record a new administration for authenticated user", async () => {
      const mockAdministration = {
        id: "33333333-3333-4333-8333-333333333333",
        animalId: "44444444-4444-4444-8444-444444444444",
        regimenId: "55555555-5555-4555-8555-555555555555",
        householdId: mockSession.access.householdId,
        caregiverId: mockSession.subject,
        recordedAt: new Date(),
        status: "ON_TIME",
        scheduledFor: null,
        sourceItemId: null,
        site: null,
        dose: "250mg",
        notes: "Test administration",
        adverseEvent: false,
        idempotencyKey: "test-key-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set up all mocks before creating context
      // Mock for animal verification
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          execute: vi.fn().mockResolvedValue([
            {
              id: "44444444-4444-4444-8444-444444444444",
              householdId: mockSession.access.householdId,
              timezone: "America/New_York",
            },
          ]),
        } as ReturnType<typeof mockDb.select>)
        // Mock for regimen verification
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          execute: vi.fn().mockResolvedValue([
            {
              id: "55555555-5555-4555-8555-555555555555",
              animalId: "44444444-4444-4444-8444-444444444444",
              active: true,
              dose: "250mg",
              scheduleType: "FIXED",
              timesLocal: ["08:00", "20:00"],
              cutoffMinutes: 240,
            },
          ]),
        } as ReturnType<typeof mockDb.select>)
        // Mock for duplicate check
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          execute: vi.fn().mockResolvedValue([]),
        } as ReturnType<typeof mockDb.select>);

      // Mock insert
      mockDb.insert.mockImplementation(
        () =>
          ({
            values: vi.fn().mockReturnThis(),
            returning: vi.fn().mockResolvedValue([mockAdministration]),
          }) as ReturnType<typeof mockDb.insert>,
      );

      // Now create the context and caller after mocks are set up
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = adminRouter.createCaller(ctx);

      const result = await caller.create({
        householdId: mockSession.access.householdId,
        animalId: "44444444-4444-4444-8444-444444444444",
        regimenId: "55555555-5555-4555-8555-555555555555",
        administeredAt: new Date().toISOString(),
        notes: "Test administration",
        idempotencyKey: "test-key-123",
      });

      expect(result).toEqual(mockAdministration);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should throw error for unauthenticated user", async () => {
      const ctx = await createMockContext();
      const caller = adminRouter.createCaller(ctx);

      await expect(
        caller.create({
          householdId: "66666666-6666-4666-8666-666666666666",
          animalId: "77777777-7777-4777-8777-777777777777",
          regimenId: "88888888-8888-4888-8888-888888888888",
          administeredAt: new Date().toISOString(),
          idempotencyKey: "test-key-123",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should validate input data", async () => {
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = adminRouter.createCaller(ctx);

      await expect(
        caller.create({
          householdId: mockSession.access.householdId,
          animalId: "", // Invalid empty string
          regimenId: "99999999-9999-4999-8999-999999999999",
          administeredAt: new Date().toISOString(),
          idempotencyKey: "test-key-123",
        }),
      ).rejects.toThrow();
    });

    it("should handle idempotency for duplicate administrations", async () => {
      const existingAdministration = {
        id: "77777777-7777-4777-8777-777777777777",
        animalId: "44444444-4444-4444-8444-444444444444",
        regimenId: "55555555-5555-4555-8555-555555555555",
        householdId: mockSession.access.householdId,
        caregiverId: mockSession.subject,
        recordedAt: new Date(),
        status: "ON_TIME",
        scheduledFor: null,
        sourceItemId: null,
        site: null,
        dose: "250mg",
        notes: null,
        adverseEvent: false,
        idempotencyKey: "test-key-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Set up mocks - order is important!
      // Mock for animal verification
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          execute: vi.fn().mockResolvedValue([
            {
              id: "44444444-4444-4444-8444-444444444444",
              householdId: mockSession.access.householdId,
              timezone: "America/New_York",
            },
          ]),
        } as ReturnType<typeof mockDb.select>)
        // Mock for regimen verification
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          execute: vi.fn().mockResolvedValue([
            {
              id: "55555555-5555-4555-8555-555555555555",
              animalId: "44444444-4444-4444-8444-444444444444",
              active: true,
              dose: "250mg",
              scheduleType: "FIXED",
              timesLocal: ["08:00", "20:00"],
              cutoffMinutes: 240,
            },
          ]),
        } as ReturnType<typeof mockDb.select>)
        // Mock for duplicate check - finds existing administration
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          execute: vi.fn().mockResolvedValue([existingAdministration]),
        } as ReturnType<typeof mockDb.select>);

      // Now create the context and caller after mocks are set up
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = adminRouter.createCaller(ctx);

      const result = await caller.create({
        householdId: mockSession.access.householdId,
        animalId: "44444444-4444-4444-8444-444444444444",
        regimenId: "55555555-5555-4555-8555-555555555555",
        administeredAt: new Date().toISOString(),
        idempotencyKey: "test-key-123",
      });

      // Should return existing administration, not create new one
      expect(result).toEqual(existingAdministration);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("should return administration history for an animal", async () => {
      const mockHistory = [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          animalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          regimenId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          householdId: mockSession.access.householdId,
          caregiverId: mockSession.subject,
          recordedAt: new Date(),
          status: "ON_TIME",
          scheduledFor: null,
          sourceItemId: null,
          site: null,
          dose: "250mg",
          notes: null,
          adverseEvent: false,
          idempotencyKey: "key-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          animalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          regimenId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          householdId: mockSession.access.householdId,
          caregiverId: mockSession.subject,
          recordedAt: new Date(),
          status: "LATE",
          scheduledFor: null,
          sourceItemId: null,
          site: null,
          dose: "250mg",
          notes: "Given late",
          adverseEvent: false,
          idempotencyKey: "key-2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Mock database query
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue(mockHistory),
      } as ReturnType<typeof mockDb.select>);

      // Now create the context and caller after mocks are set up
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = adminRouter.createCaller(ctx);

      const result = await caller.list({
        householdId: mockSession.access.householdId,
        animalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        limit: 10,
      });

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(2);
    });

    it("should respect limit parameter", async () => {
      const mockHistory = Array.from({ length: 5 }, (_, i) => ({
        id: `eeeeeeee-eeee-4eee-8eee-eeeeeeeeee${i.toString().padStart(2, "0")}`,
        animalId: "44444444-4444-4444-8444-444444444444",
        regimenId: "55555555-5555-4555-8555-555555555555",
        householdId: mockSession.access.householdId,
        caregiverId: mockSession.subject,
        recordedAt: new Date(),
        status: "ON_TIME",
        scheduledFor: null,
        sourceItemId: null,
        site: null,
        dose: "250mg",
        notes: null,
        adverseEvent: false,
        idempotencyKey: `key-${i}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const limitSpy = vi.fn().mockReturnThis();
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: limitSpy,
        execute: vi.fn().mockResolvedValue(mockHistory),
      } as ReturnType<typeof mockDb.select>);

      // Now create the context and caller after mocks are set up
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = adminRouter.createCaller(ctx);

      await caller.list({
        householdId: mockSession.access.householdId,
        animalId: "44444444-4444-4444-8444-444444444444",
        limit: 5,
      });

      expect(limitSpy).toHaveBeenCalledWith(5);
    });

    it("should filter by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const whereSpy = vi.fn().mockReturnThis();
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: whereSpy,
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([]),
      } as ReturnType<typeof mockDb.select>);

      // Now create the context and caller after mocks are set up
      const ctx = await createAuthenticatedContext(mockSession);
      const caller = adminRouter.createCaller(ctx);

      await caller.list({
        householdId: mockSession.access.householdId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(whereSpy).toHaveBeenCalled();
    });
  });
});
