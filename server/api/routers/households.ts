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
} from "@/server/api/trpc";

export const householdRouter = createTRPCRouter({
  // Clear all history data for the household
  clearHistory: ownerProcedure
    .input(
      z.object({
        householdId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { householdId } = input;

      // Verify household exists and user has owner access
      const household = await ctx.db
        .select()
        .from(households)
        .where(eq(households.id, householdId))
        .limit(1);

      if (!household[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Household not found",
        });
      }

      // Get count of data that will be affected
      const [adminCount, auditCount, notificationCount] = await Promise.all([
        ctx.db
          .select({ count: count() })
          .from(administrations)
          .where(eq(administrations.householdId, householdId)),
        ctx.db
          .select({ count: count() })
          .from(auditLog)
          .where(eq(auditLog.householdId, householdId)),
        ctx.db
          .select({ count: count() })
          .from(notificationQueue)
          .where(eq(notificationQueue.householdId, householdId)),
      ]);

      // Delete all administrations (keep animals, regimens, and medications intact)
      await ctx.db
        .delete(administrations)
        .where(eq(administrations.householdId, householdId));

      // Clear notification queue for this household
      await ctx.db
        .delete(notificationQueue)
        .where(eq(notificationQueue.householdId, householdId));

      // Clear audit logs for this household (if requested)
      await ctx.db
        .delete(auditLog)
        .where(eq(auditLog.householdId, householdId));

      // Log this critical action
      await ctx.db.insert(auditLog).values({
        action: "HOUSEHOLD_HISTORY_CLEARED",
        details: {
          administrationsDeleted: adminCount[0]?.count || 0,
          auditLogsDeleted: auditCount[0]?.count || 0,
          notificationsDeleted: notificationCount[0]?.count || 0,
        },
        householdId,
        resourceId: householdId,
        resourceType: "household",
        userId: ctx.dbUser.id,
      });

      return {
        message: "Household history cleared successfully",
        success: true,
        summary: {
          administrationsDeleted: adminCount[0]?.count || 0,
          auditLogsDeleted: auditCount[0]?.count || 0,
          notificationsDeleted: notificationCount[0]?.count || 0,
        },
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
        householdId: household.id,
        role: "OWNER",
        userId: ctx.dbUser.id,
      });

      return household;
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
          createdAt: memberships.createdAt,
          householdId: memberships.householdId,
          id: memberships.id,
          role: memberships.role,
          updatedAt: memberships.updatedAt,
          userId: memberships.userId,
        })
        .from(memberships)
        .where(eq(memberships.householdId, input.householdId));

      return {
        ...household[0],
        animals: householdAnimals,
        memberships: householdMemberships,
      };
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
          createdAt: memberships.createdAt,
          householdId: memberships.householdId,
          id: memberships.id,
          role: memberships.role,
          updatedAt: memberships.updatedAt,
          user: {
            email: users.email,
            id: users.id,
            image: users.image,
            name: users.name,
          },
          userId: memberships.userId,
        })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(eq(memberships.householdId, input.householdId));

      return members;
    }),

  // Get pending medications count for household or specific animal
  getPendingMeds: householdProcedure
    .input(
      z.object({
        animalId: z.string().optional(),
        householdId: z.string(),
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
          hour: "2-digit",
          hour12: false,
          minute: "2-digit",
          timeZone: timezone,
        }); // HH:MM format
        return {
          localDateStr,
          localMinutes: timeToMinutes(localTimeStr),
          localTimeStr,
        };
      };

      // Helper function to check if a regimen should be skipped
      const shouldSkipRegimen = (
        regimen: {
          scheduleType: string;
          endDate: Date | null;
          timesLocal: string[] | null;
        },
        currentDate: Date,
      ) =>
        regimen.scheduleType === "PRN" ||
        (regimen.endDate && regimen.endDate < currentDate) ||
        !regimen.timesLocal ||
        regimen.timesLocal.length === 0;

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
        return { endOfDayUTC, startOfDayUTC };
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
              gte(administrations.recordedAt, startOfDayUTC),
              lte(administrations.recordedAt, endOfDayUTC),
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
      const currentDate = new Date(now.toISOString().slice(0, 10));

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
          animal: animals,
          medication: medicationCatalog,
          regimen: regimens,
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
            lte(regimens.startDate, currentDate),
          ),
        );

      // Process regimens and count pending doses
      const pendingByAnimal = new Map<string, number>();
      let totalPendingCount = 0;

      for (const { regimen, animal } of activeRegimens) {
        if (shouldSkipRegimen(regimen, currentDate)) {
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
          byAnimal: Object.fromEntries(pendingByAnimal),
          pendingCount: totalPendingCount,
        };
      }
    }),

  // Invite a new member to the household
  inviteMember: ownerProcedure
    .input(
      z.object({
        email: z.email(),
        householdId: z.string(),
        message: z.string().optional(),
        role: z.enum(["OWNER", "CAREGIVER", "VETREADONLY"]),
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
          householdId,
          role,
          userId: existingUser[0].id,
        });

        // Log the action
        await ctx.db.insert(auditLog).values({
          action: "MEMBER_ADDED",
          details: { message },
          householdId,
          newValues: { email, role },
          resourceId: existingUser[0].id,
          resourceType: "membership",
          userId: ctx.dbUser.id,
        });

        // Queue notification to the new member
        await ctx.db.insert(notificationQueue).values({
          body: `You've been added to the household as a ${role.toLowerCase()}`,
          data: {
            householdId,
            invitedBy: ctx.dbUser.name || ctx.dbUser.email,
            role,
          },
          householdId,
          scheduledFor: new Date(),
          title: "Added to Household",
          type: "HOUSEHOLD_INVITATION_ACCEPTED",
          userId: existingUser[0].id,
        });

        return {
          message: "User added to household successfully",
          success: true,
          userExists: true,
        };
      }

      // User doesn't exist, create an invitation notification
      // Note: For now, we'll queue a notification. In a full implementation,
      // you'd create a proper invitation system with tokens/links.
      await ctx.db.insert(notificationQueue).values({
        body: `Invitation sent to ${email} as ${role.toLowerCase()}`,
        data: {
          invitedBy: ctx.dbUser.name || ctx.dbUser.email,
          inviteeEmail: email,
          message,
          role,
        },
        householdId,
        scheduledFor: new Date(),
        title: "Invitation Sent",
        type: "PENDING_INVITATION",
        userId: ctx.dbUser.id, // Temporarily assign to inviter for tracking
      });

      // Log the invitation
      await ctx.db.insert(auditLog).values({
        action: "INVITATION_SENT",
        details: { message },
        householdId,
        newValues: { email, role },
        resourceType: "invitation",
        userId: ctx.dbUser.id,
      });

      return {
        message: "Invitation sent successfully",
        success: true,
        userExists: false,
      };
    }),

  // Leave a household
  leave: protectedProcedure
    .input(
      z.object({
        householdId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { householdId } = input;

      // Get current user's membership
      const membership = await ctx.db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, ctx.dbUser.id),
            eq(memberships.householdId, householdId),
          ),
        )
        .limit(1);

      if (!membership[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "You are not a member of this household",
        });
      }

      // Check if user is the last owner
      if (membership[0].role === "OWNER") {
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
            message:
              "Cannot leave as the last owner. Transfer ownership first or delete the household.",
          });
        }
      }

      // Remove the membership
      await ctx.db
        .delete(memberships)
        .where(
          and(
            eq(memberships.userId, ctx.dbUser.id),
            eq(memberships.householdId, householdId),
          ),
        );

      // Log the action
      await ctx.db.insert(auditLog).values({
        action: "MEMBER_LEFT",
        householdId,
        oldValues: {
          role: membership[0].role,
          userId: ctx.dbUser.id,
        },
        resourceId: membership[0].id,
        resourceType: "membership",
        userId: ctx.dbUser.id,
      });

      return {
        message: "Successfully left the household",
        success: true,
      };
    }),
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
      joinedAt: membership.createdAt,
      role: membership.role,
    }));
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
        action: "MEMBER_REMOVED",
        householdId,
        oldValues: {
          email: membership[0].user.email,
          role: membership[0].membership.role,
          userId: membership[0].membership.userId,
        },
        resourceId: membershipId,
        resourceType: "membership",
        userId: ctx.dbUser.id,
      });

      // Notify the removed user
      await ctx.db.insert(notificationQueue).values({
        body: "You have been removed from the household",
        data: { removedBy: ctx.dbUser.name || ctx.dbUser.email },
        householdId,
        scheduledFor: new Date(),
        title: "Removed from Household",
        type: "REMOVED_FROM_HOUSEHOLD",
        userId: membership[0].membership.userId,
      });

      return {
        message: "Member removed successfully",
        success: true,
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
        action: "INVITATION_RESENT",
        householdId: input.householdId,
        resourceId: input.inviteId,
        resourceType: "invitation",
        userId: ctx.dbUser.id,
      });

      return {
        message: "Invitation resent successfully",
        success: true,
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
        action: "INVITATION_REVOKED",
        householdId: input.householdId,
        resourceId: input.inviteId,
        resourceType: "invitation",
        userId: ctx.dbUser.id,
      });

      return {
        message: "Invitation revoked successfully",
        success: true,
      };
    }),

  // Update household information
  update: ownerProcedure
    .input(
      z.object({
        householdId: z.string(),
        name: z.string().min(1).max(100),
        timezone: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { householdId, name, timezone } = input;

      // Get current household data for audit log
      const currentHousehold = await ctx.db
        .select()
        .from(households)
        .where(eq(households.id, householdId))
        .limit(1);

      if (!currentHousehold[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Household not found",
        });
      }

      // Update the household
      const [updatedHousehold] = await ctx.db
        .update(households)
        .set({
          name,
          timezone,
          updatedAt: new Date(),
        })
        .where(eq(households.id, householdId))
        .returning();

      if (!updatedHousehold) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update household",
        });
      }

      // Log the action
      await ctx.db.insert(auditLog).values({
        action: "HOUSEHOLD_UPDATED",
        householdId,
        newValues: { name, timezone },
        oldValues: {
          name: currentHousehold[0].name,
          timezone: currentHousehold[0].timezone,
        },
        resourceId: householdId,
        resourceType: "household",
        userId: ctx.dbUser.id,
      });

      return updatedHousehold;
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
          updatedAt: new Date(),
        })
        .where(eq(memberships.id, membershipId));

      // Log the action
      await ctx.db.insert(auditLog).values({
        action: "MEMBER_ROLE_UPDATED",
        householdId,
        newValues: { role: newRole },
        oldValues: { role: oldRole },
        resourceId: membershipId,
        resourceType: "membership",
        userId: ctx.dbUser.id,
      });

      // Notify the affected user
      await ctx.db.insert(notificationQueue).values({
        body: `Your role has been changed to ${newRole.toLowerCase()}`,
        data: {
          changedBy: ctx.dbUser.name || ctx.dbUser.email,
          newRole,
          oldRole,
        },
        householdId,
        scheduledFor: new Date(),
        title: "Role Updated",
        type: "ROLE_CHANGED",
        userId: membership[0].membership.userId,
      });

      return {
        message: "Member role updated successfully",
        success: true,
      };
    }),
});
