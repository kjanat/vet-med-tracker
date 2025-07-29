import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { protectedProcedure } from "../../api/trpc/init";
import { memberships } from "../../db/schema";

export type Role = "OWNER" | "CAREGIVER" | "VETREADONLY";

export const requireMembership = (
	allowedRoles: Role[] = ["OWNER", "CAREGIVER"],
) =>
	protectedProcedure.use(async ({ ctx, next, input }) => {
		if (!ctx.user) {
			throw new TRPCError({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			});
		}

		// Extract householdId from input or context
		const householdId =
			(input as { householdId?: string })?.householdId ||
			ctx.requestedHouseholdId;

		if (!householdId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "householdId required",
			});
		}

		// Check membership using Drizzle
		const membershipResult = await ctx.db
			.select()
			.from(memberships)
			.where(
				and(
					eq(memberships.householdId, householdId),
					eq(memberships.userId, ctx.user.id),
				),
			)
			.limit(1);

		const membership = membershipResult[0];

		if (!membership) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Not a member of this household",
			});
		}

		if (!allowedRoles.includes(membership.role as Role)) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: `Insufficient permissions. Required: ${allowedRoles.join(" or ")}`,
			});
		}

		return next({
			ctx: {
				...ctx,
				membership,
				householdId,
			},
		});
	});

export const requireOwnership = requireMembership(["OWNER"]);
export const requireCaregiving = requireMembership(["OWNER", "CAREGIVER"]);
export const requireReadAccess = requireMembership([
	"OWNER",
	"CAREGIVER",
	"VETREADONLY",
]);

// Verify resource belongs to household
export const verifyResourceAccess = async (
	db: typeof import("../../db").db,
	householdId: string,
	resourceType: "animal" | "regimen" | "inventory",
	resourceId: string,
) => {
	let belongsToHousehold = false;

	const { animals, regimens, inventoryItems } = await import("../../db/schema");

	switch (resourceType) {
		case "animal": {
			const animalResult = await db
				.select()
				.from(animals)
				.where(
					and(eq(animals.id, resourceId), eq(animals.householdId, householdId)),
				)
				.limit(1);
			belongsToHousehold = animalResult.length > 0;
			break;
		}

		case "regimen": {
			const regimenResult = await db
				.select()
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.where(
					and(
						eq(regimens.id, resourceId),
						eq(animals.householdId, householdId),
					),
				)
				.limit(1);
			belongsToHousehold = regimenResult.length > 0;
			break;
		}

		case "inventory": {
			const inventoryResult = await db
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, resourceId),
						eq(inventoryItems.householdId, householdId),
					),
				)
				.limit(1);
			belongsToHousehold = inventoryResult.length > 0;
			break;
		}
	}

	if (!belongsToHousehold) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: `${resourceType} does not belong to this household`,
		});
	}
};

// Audit logging helper - TODO: Implement when audit_log table is added
export const createAuditLog = async (
	_db: typeof import("../../db").db,
	{
		userId,
		householdId,
		action,
		resourceType,
		resourceId,
		details,
	}: {
		userId: string;
		householdId: string;
		action: string;
		resourceType: string;
		resourceId?: string;
		details?: Record<string, unknown>;
	},
) => {
	// TODO: Implement audit logging when audit_log table is added to schema
	console.log("Audit log:", {
		userId,
		householdId,
		action,
		resourceType,
		resourceId,
		details,
		timestamp: new Date(),
	});
};
