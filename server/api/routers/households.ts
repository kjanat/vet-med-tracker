import { TRPCError } from "@trpc/server";
import { and, count, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import {
	administrations,
	animals,
	auditLog,
	households,
	medicationCatalog,
	memberships,
	notificationQueue,
	regimens,
	users,
} from "@/db/schema";
import {
	createTRPCRouter,
	householdProcedure,
	ownerProcedure,
	protectedProcedure,
} from "@/server/api/trpc/clerk-init";

export const householdRouter = createTRPCRouter({
	// List all households for the current user
	list: protectedProcedure.query(async ({ ctx }) => {
		// Get all households where the user is a member
		const userMemberships = await ctx.db
			.select({
				household: households,
				membership: memberships,
			})
			.from(memberships)
			.innerJoin(households, eq(households.id, memberships.householdId))
			.where(eq(memberships.userId, ctx.dbUser.id));

		return userMemberships.map(({ household, membership }) => ({
			...household,
			role: membership.role,
			joinedAt: membership.createdAt,
		}));
	}),

	// Get a specific household with animals
	get: householdProcedure
		.input(
			z.object({
				householdId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Get basic household info
			const household = await ctx.db
				.select()
				.from(households)
				.where(eq(households.id, input.householdId))
				.limit(1);

			if (!household[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Household not found",
				});
			}

			// Get animals (non-deleted)
			const householdAnimals = await ctx.db
				.select()
				.from(animals)
				.where(
					and(
						eq(animals.householdId, input.householdId),
						isNull(animals.deletedAt),
					),
				);

			// Get memberships with users
			const householdMemberships = await ctx.db
				.select({
					id: memberships.id,
					userId: memberships.userId,
					householdId: memberships.householdId,
					role: memberships.role,
					createdAt: memberships.createdAt,
					updatedAt: memberships.updatedAt,
				})
				.from(memberships)
				.where(eq(memberships.householdId, input.householdId));

			return {
				...household[0],
				animals: householdAnimals,
				memberships: householdMemberships,
			};
		}),

	// Create a new household
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				timezone: z.string().default("America/New_York"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Create household
			const [household] = await ctx.db
				.insert(households)
				.values({
					name: input.name,
					timezone: input.timezone,
				})
				.returning();

			if (!household) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create household",
				});
			}

			// Add creator as owner
			await ctx.db.insert(memberships).values({
				userId: ctx.dbUser.id,
				householdId: household.id,
				role: "OWNER",
			});

			return household;
		}),

	// Get members of a household
	getMembers: householdProcedure
		.input(
			z.object({
				householdId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const members = await ctx.db
				.select({
					id: memberships.id,
					userId: memberships.userId,
					householdId: memberships.householdId,
					role: memberships.role,
					createdAt: memberships.createdAt,
					updatedAt: memberships.updatedAt,
					user: {
						id: users.id,
						name: users.name,
						email: users.email,
						image: users.image,
					},
				})
				.from(memberships)
				.innerJoin(users, eq(memberships.userId, users.id))
				.where(eq(memberships.householdId, input.householdId));

			return members;
		}),

	// Get animals for a household
	getAnimals: householdProcedure
		.input(
			z.object({
				householdId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const householdAnimals = await ctx.db
				.select()
				.from(animals)
				.where(
					and(
						eq(animals.householdId, input.householdId),
						isNull(animals.deletedAt),
					),
				);

			return householdAnimals;
		}),

	// Get pending medications count for household or specific animal
	getPendingMeds: householdProcedure
		.input(
			z.object({
				householdId: z.string(),
				animalId: z.string().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Helper functions for time and date calculations
			const timeToMinutes = (timeStr: string): number => {
				const [hours, minutes] = timeStr.split(":").map(Number);
				return (hours ?? 0) * 60 + (minutes ?? 0);
			};

			const getLocalDateTime = (timezone: string, date = new Date()) => {
				const localDateStr = date.toLocaleDateString("en-CA", {
					timeZone: timezone,
				}); // YYYY-MM-DD format
				const localTimeStr = date.toLocaleTimeString("en-GB", {
					timeZone: timezone,
					hour12: false,
					hour: "2-digit",
					minute: "2-digit",
				}); // HH:MM format
				return {
					localDateStr,
					localTimeStr,
					localMinutes: timeToMinutes(localTimeStr),
				};
			};

			// Helper function to check if a regimen should be skipped
			const shouldSkipRegimen = (
				regimen: {
					scheduleType: string;
					endDate: string | null;
					timesLocal: string[] | null;
				},
				currentDateStr: string,
			): boolean => {
				return (
					regimen.scheduleType === "PRN" ||
					(regimen.endDate && regimen.endDate < currentDateStr) ||
					!regimen.timesLocal ||
					regimen.timesLocal.length === 0
				);
			};

			// Helper function to check if a dose is pending
			const isDosePending = (
				localMinutes: number,
				scheduledMinutes: number,
				cutoffMinutes: number,
			): boolean => {
				const minutesPastScheduled = localMinutes - scheduledMinutes;
				return (
					minutesPastScheduled > 0 && minutesPastScheduled <= cutoffMinutes
				);
			};

			// Helper function to get UTC day boundaries for a scheduled time
			const getUTCDayBoundaries = (
				localDateStr: string,
				scheduledTime: string,
			) => {
				const scheduledDateTime = new Date(
					`${localDateStr}T${scheduledTime}:00`,
				);
				const scheduledUTC = new Date(
					scheduledDateTime.toLocaleString("en-US", { timeZone: "UTC" }),
				);
				const startOfDayUTC = new Date(scheduledUTC);
				startOfDayUTC.setHours(0, 0, 0, 0);
				const endOfDayUTC = new Date(scheduledUTC);
				endOfDayUTC.setHours(23, 59, 59, 999);
				return { startOfDayUTC, endOfDayUTC };
			};

			// Helper function to check if administration exists for a time slot
			const hasExistingAdministration = async (
				regimenId: string,
				animalId: string,
				startOfDayUTC: Date,
				endOfDayUTC: Date,
			): Promise<boolean> => {
				const existingAdmin = await ctx.db
					.select()
					.from(administrations)
					.where(
						and(
							eq(administrations.regimenId, regimenId),
							eq(administrations.animalId, animalId),
							gte(administrations.recordedAt, startOfDayUTC.toISOString()),
							lte(administrations.recordedAt, endOfDayUTC.toISOString()),
						),
					)
					.limit(1);
				return existingAdmin.length > 0;
			};

			// Helper function to process scheduled times for a regimen
			const processScheduledTimes = async (
				regimen: {
					id: string;
					timesLocal: string[] | null;
					cutoffMinutes: number;
				},
				animal: { id: string },
				localDateStr: string,
				localMinutes: number,
			): Promise<number> => {
				let pendingCount = 0;

				// Check if timesLocal is null or empty
				if (!regimen.timesLocal || regimen.timesLocal.length === 0) {
					return 0;
				}

				for (const scheduledTime of regimen.timesLocal) {
					const scheduledMinutes = timeToMinutes(scheduledTime);
					const cutoffMinutes = regimen.cutoffMinutes;

					if (!isDosePending(localMinutes, scheduledMinutes, cutoffMinutes)) {
						continue;
					}

					const { startOfDayUTC, endOfDayUTC } = getUTCDayBoundaries(
						localDateStr,
						scheduledTime,
					);
					const hasAdmin = await hasExistingAdministration(
						regimen.id,
						animal.id,
						startOfDayUTC,
						endOfDayUTC,
					);

					if (!hasAdmin) {
						pendingCount++;
					}
				}

				return pendingCount;
			};

			// Main logic starts here
			const now = new Date();
			const currentDateStr = now.toISOString().split("T")[0] as string;

			// Build animal query conditions
			const animalConditions = [
				eq(animals.householdId, input.householdId),
				isNull(animals.deletedAt),
			];

			if (input.animalId) {
				animalConditions.push(eq(animals.id, input.animalId));
			}

			// Fetch active regimens
			const activeRegimens = await ctx.db
				.select({
					regimen: regimens,
					animal: animals,
					medication: medicationCatalog,
				})
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.innerJoin(
					medicationCatalog,
					eq(regimens.medicationId, medicationCatalog.id),
				)
				.where(
					and(
						...animalConditions,
						eq(regimens.active, true),
						isNull(regimens.deletedAt),
						isNull(regimens.pausedAt),
						lte(regimens.startDate, currentDateStr),
					),
				);

			// Process regimens and count pending doses
			const pendingByAnimal = new Map<string, number>();
			let totalPendingCount = 0;

			for (const { regimen, animal } of activeRegimens) {
				if (shouldSkipRegimen(regimen, currentDateStr)) {
					continue;
				}

				const { localDateStr, localMinutes } = getLocalDateTime(
					animal.timezone,
					now,
				);
				const pendingForRegimen = await processScheduledTimes(
					regimen,
					animal,
					localDateStr,
					localMinutes,
				);

				if (pendingForRegimen > 0) {
					totalPendingCount += pendingForRegimen;
					if (!input.animalId) {
						const currentCount = pendingByAnimal.get(animal.id) || 0;
						pendingByAnimal.set(animal.id, currentCount + pendingForRegimen);
					}
				}
			}

			// Return results based on query type
			if (input.animalId) {
				return { pendingCount: totalPendingCount };
			} else {
				return {
					pendingCount: totalPendingCount,
					byAnimal: Object.fromEntries(pendingByAnimal),
				};
			}
		}),

	// Invite a new member to the household
	inviteMember: ownerProcedure
		.input(
			z.object({
				householdId: z.string(),
				email: z.string().email(),
				role: z.enum(["OWNER", "CAREGIVER", "VETREADONLY"]),
				message: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { householdId, email, role, message } = input;

			// Check if user already exists in the system
			const existingUser = await ctx.db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1);

			// Check if user is already a member of this household
			if (existingUser[0]) {
				const existingMembership = await ctx.db
					.select()
					.from(memberships)
					.where(
						and(
							eq(memberships.userId, existingUser[0].id),
							eq(memberships.householdId, householdId),
						),
					)
					.limit(1);

				if (existingMembership[0]) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "User is already a member of this household",
					});
				}

				// User exists, add them directly to the household
				await ctx.db.insert(memberships).values({
					userId: existingUser[0].id,
					householdId,
					role,
				});

				// Log the action
				await ctx.db.insert(auditLog).values({
					userId: ctx.dbUser.id,
					householdId,
					action: "MEMBER_ADDED",
					resourceType: "membership",
					resourceId: existingUser[0].id,
					newValues: { email, role },
					details: { message },
				});

				// Queue notification to the new member
				await ctx.db.insert(notificationQueue).values({
					userId: existingUser[0].id,
					householdId,
					type: "HOUSEHOLD_INVITATION_ACCEPTED",
					title: "Added to Household",
					body: `You've been added to the household as a ${role.toLowerCase()}`,
					scheduledFor: new Date().toISOString(),
					data: {
						householdId,
						role,
						invitedBy: ctx.dbUser.name || ctx.dbUser.email,
					},
				});

				return {
					success: true,
					userExists: true,
					message: "User added to household successfully",
				};
			}

			// User doesn't exist, create an invitation notification
			// Note: For now, we'll queue a notification. In a full implementation,
			// you'd create a proper invitation system with tokens/links.
			await ctx.db.insert(notificationQueue).values({
				userId: ctx.dbUser.id, // Temporarily assign to inviter for tracking
				householdId,
				type: "PENDING_INVITATION",
				title: "Invitation Sent",
				body: `Invitation sent to ${email} as ${role.toLowerCase()}`,
				scheduledFor: new Date().toISOString(),
				data: {
					inviteeEmail: email,
					role,
					invitedBy: ctx.dbUser.name || ctx.dbUser.email,
					message,
				},
			});

			// Log the invitation
			await ctx.db.insert(auditLog).values({
				userId: ctx.dbUser.id,
				householdId,
				action: "INVITATION_SENT",
				resourceType: "invitation",
				newValues: { email, role },
				details: { message },
			});

			return {
				success: true,
				userExists: false,
				message: "Invitation sent successfully",
			};
		}),

	// Update a member's role
	updateMemberRole: ownerProcedure
		.input(
			z.object({
				householdId: z.string(),
				membershipId: z.string(),
				newRole: z.enum(["OWNER", "CAREGIVER", "VETREADONLY"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { householdId, membershipId, newRole } = input;

			// Get the membership to update
			const membership = await ctx.db
				.select({
					membership: memberships,
					user: users,
				})
				.from(memberships)
				.innerJoin(users, eq(memberships.userId, users.id))
				.where(
					and(
						eq(memberships.id, membershipId),
						eq(memberships.householdId, householdId),
					),
				)
				.limit(1);

			if (!membership[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Membership not found",
				});
			}

			const oldRole = membership[0].membership.role;

			// If changing from OWNER, ensure at least one OWNER remains
			if (oldRole === "OWNER" && newRole !== "OWNER") {
				const ownerCount = await ctx.db
					.select({ count: count() })
					.from(memberships)
					.where(
						and(
							eq(memberships.householdId, householdId),
							eq(memberships.role, "OWNER"),
						),
					);

				if (!ownerCount[0] || ownerCount[0].count <= 1) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot remove the last owner from the household",
					});
				}
			}

			// Update the membership
			await ctx.db
				.update(memberships)
				.set({
					role: newRole,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(memberships.id, membershipId));

			// Log the action
			await ctx.db.insert(auditLog).values({
				userId: ctx.dbUser.id,
				householdId,
				action: "MEMBER_ROLE_UPDATED",
				resourceType: "membership",
				resourceId: membershipId,
				oldValues: { role: oldRole },
				newValues: { role: newRole },
			});

			// Notify the affected user
			await ctx.db.insert(notificationQueue).values({
				userId: membership[0].membership.userId,
				householdId,
				type: "ROLE_CHANGED",
				title: "Role Updated",
				body: `Your role has been changed to ${newRole.toLowerCase()}`,
				scheduledFor: new Date().toISOString(),
				data: {
					oldRole,
					newRole,
					changedBy: ctx.dbUser.name || ctx.dbUser.email,
				},
			});

			return {
				success: true,
				message: "Member role updated successfully",
			};
		}),

	// Remove a member from the household
	removeMember: ownerProcedure
		.input(
			z.object({
				householdId: z.string(),
				membershipId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { householdId, membershipId } = input;

			// Get the membership to remove
			const membership = await ctx.db
				.select({
					membership: memberships,
					user: users,
				})
				.from(memberships)
				.innerJoin(users, eq(memberships.userId, users.id))
				.where(
					and(
						eq(memberships.id, membershipId),
						eq(memberships.householdId, householdId),
					),
				)
				.limit(1);

			if (!membership[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Membership not found",
				});
			}

			// Prevent removing the last owner
			if (membership[0].membership.role === "OWNER") {
				const ownerCount = await ctx.db
					.select({ count: count() })
					.from(memberships)
					.where(
						and(
							eq(memberships.householdId, householdId),
							eq(memberships.role, "OWNER"),
						),
					);

				if (!ownerCount[0] || ownerCount[0].count <= 1) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Cannot remove the last owner from the household",
					});
				}
			}

			// Prevent users from removing themselves
			if (membership[0].membership.userId === ctx.dbUser.id) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "You cannot remove yourself from the household",
				});
			}

			// Remove the membership
			await ctx.db.delete(memberships).where(eq(memberships.id, membershipId));

			// Log the action
			await ctx.db.insert(auditLog).values({
				userId: ctx.dbUser.id,
				householdId,
				action: "MEMBER_REMOVED",
				resourceType: "membership",
				resourceId: membershipId,
				oldValues: {
					userId: membership[0].membership.userId,
					role: membership[0].membership.role,
					email: membership[0].user.email,
				},
			});

			// Notify the removed user
			await ctx.db.insert(notificationQueue).values({
				userId: membership[0].membership.userId,
				householdId,
				type: "REMOVED_FROM_HOUSEHOLD",
				title: "Removed from Household",
				body: "You have been removed from the household",
				scheduledFor: new Date().toISOString(),
				data: { removedBy: ctx.dbUser.name || ctx.dbUser.email },
			});

			return {
				success: true,
				message: "Member removed successfully",
			};
		}),

	// Resend invitation (placeholder - in a real implementation would resend email)
	resendInvite: ownerProcedure
		.input(
			z.object({
				householdId: z.string(),
				inviteId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// For now, just log the action since we don't have a full invitation system
			await ctx.db.insert(auditLog).values({
				userId: ctx.dbUser.id,
				householdId: input.householdId,
				action: "INVITATION_RESENT",
				resourceType: "invitation",
				resourceId: input.inviteId,
			});

			return {
				success: true,
				message: "Invitation resent successfully",
			};
		}),

	// Revoke invitation (placeholder - in a real implementation would cancel invitation)
	revokeInvite: ownerProcedure
		.input(
			z.object({
				householdId: z.string(),
				inviteId: z.string(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// For now, just log the action since we don't have a full invitation system
			await ctx.db.insert(auditLog).values({
				userId: ctx.dbUser.id,
				householdId: input.householdId,
				action: "INVITATION_REVOKED",
				resourceType: "invitation",
				resourceId: input.inviteId,
			});

			return {
				success: true,
				message: "Invitation revoked successfully",
			};
		}),
});
