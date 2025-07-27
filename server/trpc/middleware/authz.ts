import { TRPCError } from "@trpc/server"
import { t } from "../trpc"

export type Role = "OWNER" | "CAREGIVER" | "VETREADONLY"

export const requireMembership = (allowedRoles: Role[] = ["OWNER", "CAREGIVER"]) =>
  t.middleware(async ({ ctx, next, rawInput }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" })
    }

    // Extract householdId from input
    const householdId = ("householdId" in rawInput ? (rawInput as any).householdId : ctx.householdId) as
      | string
      | undefined

    if (!householdId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "householdId required" })
    }

    // Check membership
    const membership = await ctx.db.membership.findFirst({
      where: {
        householdId,
        userId: ctx.user.id,
      },
    })

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Not a member of this household",
      })
    }

    if (!allowedRoles.includes(membership.role as Role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Insufficient permissions. Required: ${allowedRoles.join(" or ")}`,
      })
    }

    return next({
      ctx: {
        ...ctx,
        membership,
        householdId,
      },
    })
  })

export const requireOwnership = requireMembership(["OWNER"])
export const requireCaregiving = requireMembership(["OWNER", "CAREGIVER"])
export const requireReadAccess = requireMembership(["OWNER", "CAREGIVER", "VETREADONLY"])

// Verify resource belongs to household
export const verifyResourceAccess = async (
  db: any,
  householdId: string,
  resourceType: "animal" | "regimen" | "inventory",
  resourceId: string,
) => {
  let belongsToHousehold = false

  switch (resourceType) {
    case "animal":
      const animal = await db.animal.findFirst({
        where: { id: resourceId, householdId },
      })
      belongsToHousehold = !!animal
      break

    case "regimen":
      const regimen = await db.regimen.findFirst({
        where: {
          id: resourceId,
          animal: { householdId },
        },
        include: { animal: true },
      })
      belongsToHousehold = !!regimen
      break

    case "inventory":
      const inventory = await db.inventoryItem.findFirst({
        where: { id: resourceId, householdId },
      })
      belongsToHousehold = !!inventory
      break
  }

  if (!belongsToHousehold) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `${resourceType} does not belong to this household`,
    })
  }
}

// Audit logging helper
export const createAuditLog = async (
  db: any,
  {
    userId,
    householdId,
    action,
    resourceType,
    resourceId,
    details,
  }: {
    userId: string
    householdId: string
    action: string
    resourceType: string
    resourceId?: string
    details?: Record<string, any>
  },
) => {
  await db.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      householdId,
      action,
      resourceType,
      resourceId,
      details: details ? JSON.stringify(details) : null,
      timestamp: new Date(),
      ipAddress: "unknown", // TODO: Extract from request
      userAgent: "unknown", // TODO: Extract from request
    },
  })
}
