import { TRPCError } from "@trpc/server";
import { and, eq, lt, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import {
  administrations,
  animals,
  cosignRequests,
  medicationCatalog,
  memberships,
  type NewCosignRequest,
  notifications,
  regimens,
  users,
} from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";
import { createAuditLog } from "@/server/utils/audit-log";

// Create aliases for multiple joins on the same table
const requesterUsers = alias(users, "requester_users");
const cosignerUsers = alias(users, "cosigner_users");

// Input validation schemas
const createRequestSchema = z.object({
  administrationId: z.uuid(),
  cosignerId: z.uuid(),
  householdId: z.uuid(),
});

const approveRequestSchema = z.object({
  householdId: z.uuid(),
  requestId: z.uuid(),
  signature: z.string().min(1, "Signature is required"),
});

const rejectRequestSchema = z.object({
  householdId: z.uuid(),
  rejectionReason: z.string().min(1, "Rejection reason is required"),
  requestId: z.uuid(),
});

const listPendingSchema = z.object({
  householdId: z.uuid(),
  limit: z.number().min(1).max(100).default(50),
});

const getRequestSchema = z.object({
  householdId: z.uuid(),
  requestId: z.uuid(),
});

// Helper function to verify administration exists and belongs to household
async function verifyAdministration(
  db: typeof import("@/db/drizzle").db,
  administrationId: string,
  householdId: string,
) {
  const result = await db
    .select({
      administration: administrations,
      animal: animals,
      medication: medicationCatalog,
      regimen: regimens,
    })
    .from(administrations)
    .innerJoin(regimens, eq(administrations.regimenId, regimens.id))
    .innerJoin(animals, eq(administrations.animalId, animals.id))
    .innerJoin(
      medicationCatalog,
      eq(regimens.medicationId, medicationCatalog.id),
    )
    .where(
      and(
        eq(administrations.id, administrationId),
        eq(administrations.householdId, householdId),
      ),
    )
    .limit(1)
    .execute();

  if (!result[0]) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Administration record not found in this household",
    });
  }

  return result[0];
}

// Helper function to verify user is valid co-signer
async function verifyCosigner(
  db: typeof import("@/db/drizzle").db,
  cosignerId: string,
  householdId: string,
  requesterId: string,
) {
  // Cannot co-sign for yourself
  if (cosignerId === requesterId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot request co-signing from yourself",
    });
  }

  // Check if cosigner is a member of the household
  const membership = await db
    .select({
      membership: memberships,
      user: users,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(
      and(
        eq(memberships.userId, cosignerId),
        eq(memberships.householdId, householdId),
      ),
    )
    .limit(1)
    .execute();

  if (!membership[0]) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Cosigner is not a member of this household",
    });
  }

  // Check if cosigner has appropriate role (not VETREADONLY)
  if (membership[0].membership.role === "VETREADONLY") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Users with VETREADONLY role cannot co-sign administrations",
    });
  }

  return membership[0];
}

// Helper function to check for existing co-sign request
async function checkExistingRequest(
  db: typeof import("@/db/drizzle").db,
  administrationId: string,
) {
  const existing = await db
    .select()
    .from(cosignRequests)
    .where(eq(cosignRequests.administrationId, administrationId))
    .limit(1)
    .execute();

  return existing[0] || null;
}

// Helper function to expire old requests
async function expireOldRequests(db: typeof import("@/db/drizzle").db) {
  const now = new Date();

  await db
    .update(cosignRequests)
    .set({
      status: "expired",
      updatedAt: now,
    })
    .where(
      and(
        eq(cosignRequests.status, "pending"),
        lt(cosignRequests.expiresAt, now),
      ),
    );
}

// Helper function to create notification for co-signer
async function createCosignNotification(
  db: typeof import("@/db/drizzle").db,
  {
    cosignerId,
    householdId,
    administrationId,
    requesterName,
    animalName,
    medicationName,
  }: {
    cosignerId: string;
    householdId: string;
    administrationId: string;
    requesterName: string;
    animalName: string;
    medicationName: string;
  },
) {
  await db.insert(notifications).values({
    actionUrl: `/administrations/${administrationId}?tab=cosign`,
    data: {
      administrationId,
      animalName,
      medicationName,
      requesterName,
    },
    householdId,
    message: `${requesterName} requested co-signing for ${medicationName} administration to ${animalName}`,
    priority: "high",
    title: "Co-sign Request",
    type: "cosign_request",
    userId: cosignerId,
  });
}

export const cosignerRouter = createTRPCRouter({
  // Approve a co-sign request with signature
  approve: householdProcedure
    .input(approveRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Expire old requests first
      await expireOldRequests(ctx.db);

      // Get the request with full details
      const requestResult = await ctx.db
        .select({
          administration: administrations,
          animal: animals,
          medication: medicationCatalog,
          regimen: regimens,
          request: cosignRequests,
          requester: users,
        })
        .from(cosignRequests)
        .innerJoin(
          administrations,
          eq(cosignRequests.administrationId, administrations.id),
        )
        .innerJoin(regimens, eq(administrations.regimenId, regimens.id))
        .innerJoin(animals, eq(administrations.animalId, animals.id))
        .innerJoin(
          medicationCatalog,
          eq(regimens.medicationId, medicationCatalog.id),
        )
        .innerJoin(users, eq(cosignRequests.requesterId, users.id))
        .where(
          and(
            eq(cosignRequests.id, input.requestId),
            eq(cosignRequests.householdId, input.householdId),
            eq(cosignRequests.cosignerId, ctx.dbUser.id), // Only assigned cosigner can approve
            eq(cosignRequests.status, "pending"),
          ),
        )
        .limit(1)
        .execute();

      if (!requestResult[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Co-sign request not found, already processed, or you are not the assigned cosigner",
        });
      }

      const { request, administration } = requestResult[0];

      // Check if request has expired
      if (new Date(request.expiresAt) < new Date()) {
        // Mark as expired
        await ctx.db
          .update(cosignRequests)
          .set({
            status: "expired",
            updatedAt: new Date(),
          })
          .where(eq(cosignRequests.id, input.requestId));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Co-sign request has expired",
        });
      }

      // Check if administration is already co-signed
      if (administration.coSignedAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Administration has already been co-signed",
        });
      }

      const now = new Date();

      // Update the co-sign request
      const updatedRequest = await ctx.db
        .update(cosignRequests)
        .set({
          signature: input.signature,
          signedAt: now,
          status: "approved",
          updatedAt: now,
        })
        .where(eq(cosignRequests.id, input.requestId))
        .returning()
        .execute();

      // Update the administration record with co-sign information
      const updatedAdministration = await ctx.db
        .update(administrations)
        .set({
          coSignedAt: now,
          coSignNotes: `Co-signed via signature request system`,
          coSignUserId: ctx.dbUser.id,
          updatedAt: now,
        })
        .where(eq(administrations.id, request.administrationId))
        .returning()
        .execute();

      // Create audit log
      await createAuditLog(ctx.db, {
        action: "APPROVE_COSIGN_REQUEST",
        details: {
          administrationId: request.administrationId,
          signatureProvided: true,
        },
        householdId: input.householdId,
        newValues: updatedRequest[0],
        oldValues: request,
        recordId: input.requestId,
        tableName: "cosign_requests",
        userId: ctx.dbUser.id,
      });

      return {
        administration: updatedAdministration[0],
        request: updatedRequest[0],
      };
    }),
  // Create a co-sign request
  createRequest: householdProcedure
    .input(createRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Expire old requests first
      await expireOldRequests(ctx.db);

      // Verify administration exists
      const adminData = await verifyAdministration(
        ctx.db,
        input.administrationId,
        input.householdId,
      );

      // Check if regimen requires co-signing
      if (!adminData.regimen.requiresCoSign) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This medication does not require co-signing",
        });
      }

      // Check if already co-signed in the administration record
      if (adminData.administration.coSignedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This administration has already been co-signed",
        });
      }

      // Cannot request co-signing for your own administration
      if (adminData.administration.caregiverId === ctx.dbUser.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot request co-signing for your own administration",
        });
      }

      // Check for existing request
      const existingRequest = await checkExistingRequest(
        ctx.db,
        input.administrationId,
      );

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A co-sign request for this administration already exists",
          });
        }
      }

      // Verify cosigner
      const _cosignerData = await verifyCosigner(
        ctx.db,
        input.cosignerId,
        input.householdId,
        ctx.dbUser.id,
      );

      // Create expiration time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Create the co-sign request
      const newRequest: NewCosignRequest = {
        administrationId: input.administrationId,
        cosignerId: input.cosignerId,
        expiresAt: expiresAt,
        householdId: input.householdId,
        requesterId: ctx.dbUser.id,
        status: "pending",
      };

      const result = await ctx.db
        .insert(cosignRequests)
        .values(newRequest)
        .returning()
        .execute();

      if (!result[0]) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create co-sign request",
        });
      }

      // Create notification for cosigner
      await createCosignNotification(ctx.db, {
        administrationId: input.administrationId,
        animalName: adminData.animal.name,
        cosignerId: input.cosignerId,
        householdId: input.householdId,
        medicationName: adminData.medication.genericName,
        requesterName: ctx.dbUser.name || ctx.dbUser.email,
      });

      // Create audit log
      await createAuditLog(ctx.db, {
        action: "CREATE_COSIGN_REQUEST",
        details: {
          administrationId: input.administrationId,
          cosignerId: input.cosignerId,
        },
        householdId: input.householdId,
        newValues: result[0],
        recordId: result[0].id,
        tableName: "cosign_requests",
        userId: ctx.dbUser.id,
      });

      return result[0];
    }),

  // Get specific co-sign request details
  getRequest: householdProcedure
    .input(getRequestSchema)
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          administration: administrations,
          animal: animals,
          cosigner: cosignerUsers,
          medication: medicationCatalog,
          regimen: regimens,
          request: cosignRequests,
          requester: requesterUsers,
        })
        .from(cosignRequests)
        .innerJoin(
          administrations,
          eq(cosignRequests.administrationId, administrations.id),
        )
        .innerJoin(regimens, eq(administrations.regimenId, regimens.id))
        .innerJoin(animals, eq(administrations.animalId, animals.id))
        .innerJoin(
          medicationCatalog,
          eq(regimens.medicationId, medicationCatalog.id),
        )
        .innerJoin(
          requesterUsers,
          eq(cosignRequests.requesterId, requesterUsers.id),
        )
        .leftJoin(
          cosignerUsers,
          eq(cosignRequests.cosignerId, cosignerUsers.id),
        )
        .where(
          and(
            eq(cosignRequests.id, input.requestId),
            eq(cosignRequests.householdId, input.householdId),
            // User must be either the requester or the cosigner
            or(
              eq(cosignRequests.requesterId, ctx.dbUser.id),
              eq(cosignRequests.cosignerId, ctx.dbUser.id),
            ),
          ),
        )
        .limit(1)
        .execute();

      if (!result[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Co-sign request not found or you don't have access to it",
        });
      }

      return result[0];
    }),

  // List all co-sign requests in household (for audit purposes)
  listAll: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        limit: z.number().min(1).max(100).default(50),
        status: z
          .enum(["pending", "approved", "rejected", "expired"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(cosignRequests.householdId, input.householdId)];

      if (input.status) {
        conditions.push(eq(cosignRequests.status, input.status));
      }

      const result = await ctx.db
        .select({
          administration: administrations,
          animal: animals,
          cosigner: cosignerUsers,
          medication: medicationCatalog,
          regimen: regimens,
          request: cosignRequests,
          requester: requesterUsers,
        })
        .from(cosignRequests)
        .innerJoin(
          administrations,
          eq(cosignRequests.administrationId, administrations.id),
        )
        .innerJoin(regimens, eq(administrations.regimenId, regimens.id))
        .innerJoin(animals, eq(administrations.animalId, animals.id))
        .innerJoin(
          medicationCatalog,
          eq(regimens.medicationId, medicationCatalog.id),
        )
        .innerJoin(
          requesterUsers,
          eq(cosignRequests.requesterId, requesterUsers.id),
        )
        .leftJoin(
          cosignerUsers,
          eq(cosignRequests.cosignerId, cosignerUsers.id),
        )
        .where(and(...conditions))
        .orderBy(cosignRequests.createdAt)
        .limit(input.limit)
        .execute();

      return result;
    }),

  // List pending co-sign requests for current user
  listPending: householdProcedure
    .input(listPendingSchema)
    .query(async ({ ctx, input }) => {
      // Expire old requests first
      await expireOldRequests(ctx.db);

      const result = await ctx.db
        .select({
          administration: administrations,
          animal: animals,
          medication: medicationCatalog,
          regimen: regimens,
          request: cosignRequests,
          requester: requesterUsers,
        })
        .from(cosignRequests)
        .innerJoin(
          administrations,
          eq(cosignRequests.administrationId, administrations.id),
        )
        .innerJoin(regimens, eq(administrations.regimenId, regimens.id))
        .innerJoin(animals, eq(administrations.animalId, animals.id))
        .innerJoin(
          medicationCatalog,
          eq(regimens.medicationId, medicationCatalog.id),
        )
        .innerJoin(
          requesterUsers,
          eq(cosignRequests.requesterId, requesterUsers.id),
        )
        .where(
          and(
            eq(cosignRequests.householdId, input.householdId),
            eq(cosignRequests.cosignerId, ctx.dbUser.id),
            eq(cosignRequests.status, "pending"),
          ),
        )
        .orderBy(cosignRequests.createdAt)
        .limit(input.limit)
        .execute();

      return result;
    }),

  // Reject a co-sign request
  reject: householdProcedure
    .input(rejectRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Expire old requests first
      await expireOldRequests(ctx.db);

      // Get the request
      const existing = await ctx.db
        .select()
        .from(cosignRequests)
        .where(
          and(
            eq(cosignRequests.id, input.requestId),
            eq(cosignRequests.householdId, input.householdId),
            eq(cosignRequests.cosignerId, ctx.dbUser.id), // Only assigned cosigner can reject
            eq(cosignRequests.status, "pending"),
          ),
        )
        .limit(1)
        .execute();

      if (!existing[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "Co-sign request not found, already processed, or you are not the assigned cosigner",
        });
      }

      // Check if request has expired
      if (new Date(existing[0].expiresAt) < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Co-sign request has expired",
        });
      }

      // Update the request
      const result = await ctx.db
        .update(cosignRequests)
        .set({
          rejectionReason: input.rejectionReason,
          status: "rejected",
          updatedAt: new Date(),
        })
        .where(eq(cosignRequests.id, input.requestId))
        .returning()
        .execute();

      // Create audit log
      await createAuditLog(ctx.db, {
        action: "REJECT_COSIGN_REQUEST",
        details: {
          rejectionReason: input.rejectionReason,
        },
        householdId: input.householdId,
        newValues: result[0],
        oldValues: existing[0],
        recordId: input.requestId,
        tableName: "cosign_requests",
        userId: ctx.dbUser.id,
      });

      return result[0];
    }),
});
