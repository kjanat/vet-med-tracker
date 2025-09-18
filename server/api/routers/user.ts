import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { animals, households, memberships, users } from "@/db/schema";
import type { VetMedPreferences } from "@/hooks/shared/use-user-preferences";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Stub for updating user preferences - this would update Stack Auth metadata in production
async function updateUserPreferences(
  stackUserId: string,
  preferences: {
    vetMedPreferences?: Partial<VetMedPreferences>;
    householdSettings?: Record<string, unknown>;
  },
  _dbContext: {
    userId: string;
    householdId: string | null;
  },
) {
  // In production, this would update Stack Auth user metadata
  // For now, we'll just log the update
  console.log("Updating preferences for user:", stackUserId, preferences);
  return true;
}

export const userRouter = createTRPCRouter({
  // Get current household context
  getCurrentHousehold: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.currentHouseholdId) {
      return null;
    }

    const currentHousehold = ctx.availableHouseholds.find(
      (h) => h.id === ctx.currentHouseholdId,
    );
    return currentHousehold || null;
  }),

  // Get user's membership in a specific household
  getMembership: protectedProcedure
    .input(z.object({ householdId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.userId, ctx.dbUser.id),
            eq(memberships.householdId, input.householdId),
          ),
        )
        .limit(1);

      if (!membership[0]) {
        throw new Error("Membership not found");
      }

      return {
        id: membership[0].id,
        joinedAt: membership[0].createdAt,
        role: membership[0].role,
      };
    }),
  // Get current user's memberships
  getMemberships: protectedProcedure.query(async ({ ctx }) => {
    const userMemberships = await ctx.db
      .select({
        household: {
          createdAt: households.createdAt,
          id: households.id,
          name: households.name,
          timezone: households.timezone,
        },
        id: memberships.id,
        joinedAt: memberships.createdAt,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(households, eq(memberships.householdId, households.id))
      .where(eq(memberships.userId, ctx.dbUser.id));

    // Add member and animal counts
    return await Promise.all(
      userMemberships.map(async (membership) => {
        const [memberCount, animalCount] = await Promise.all([
          ctx.db
            .select()
            .from(memberships)
            .where(eq(memberships.householdId, membership.household.id)),
          ctx.db
            .select()
            .from(animals)
            .where(
              and(
                eq(animals.householdId, membership.household.id),
                isNull(animals.deletedAt),
              ),
            ),
        ]);

        return {
          ...membership,
          household: {
            ...membership.household,
            _count: {
              animals: animalCount.length,
              members: memberCount.length,
            },
          },
        };
      }),
    );
  }),

  // Get user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => ({
    availableHouseholds: ctx.availableHouseholds,
    bio: ctx.dbUser.bio,
    currentHouseholdId: ctx.currentHouseholdId,
    email: ctx.dbUser.email,
    // Flexible profile fields
    firstName: ctx.dbUser.firstName,
    id: ctx.dbUser.id,
    image: ctx.dbUser.image,
    lastName: ctx.dbUser.lastName,
    location: ctx.dbUser.location,
    name: ctx.dbUser.name,
    onboarding: {
      complete: ctx.dbUser.onboardingComplete,
      completedAt: ctx.dbUser.onboardingCompletedAt,
    },
    preferences: {
      defaultAnimalId: ctx.dbUser.defaultAnimalId,
      defaultHouseholdId: ctx.dbUser.defaultHouseholdId,
      emailReminders: ctx.dbUser.emailReminders,
      emergencyContact: {
        name: ctx.dbUser.emergencyContactName,
        phone: ctx.dbUser.emergencyContactPhone,
      },
      phoneNumber: ctx.dbUser.preferredPhoneNumber,
      pushNotifications: ctx.dbUser.pushNotifications,
      reminderLeadTime: ctx.dbUser.reminderLeadTimeMinutes,
      smsReminders: ctx.dbUser.smsReminders,
      temperatureUnit: ctx.dbUser.temperatureUnit,
      theme: ctx.dbUser.theme,
      timezone: ctx.dbUser.preferredTimezone,
      use24HourTime: ctx.dbUser.use24HourTime,
      weekStartsOn: ctx.dbUser.weekStartsOn,
      weightUnit: ctx.dbUser.weightUnit,
    },
    profileCompletedAt: ctx.dbUser.profileCompletedAt,
    profileData: ctx.dbUser.profileData as Record<string, unknown>,
    profileVisibility: ctx.dbUser.profileVisibility as Record<string, boolean>,
    pronouns: ctx.dbUser.pronouns,
    socialLinks: ctx.dbUser.socialLinks as Record<string, unknown>,
    stackUserId: ctx.dbUser.stackUserId,
    website: ctx.dbUser.website,
  })),

  // Check if user needs onboarding
  needsOnboarding: protectedProcedure.query(async ({ ctx }) => {
    const hasPreferences =
      ctx.stackUser?.clientMetadata?.vetMedPreferences ||
      ctx.stackUser?.clientMetadata?.householdSettings;
    const hasCompletedOnboarding =
      ctx.stackUser?.clientMetadata?.onboardingComplete;

    return !hasPreferences && !hasCompletedOnboarding;
  }),

  // Update user preferences
  updatePreferences: protectedProcedure
    .input(
      z.object({
        householdSettings: z
          .object({
            primaryHouseholdName: z.string().optional(),
          })
          .optional(),
        vetMedPreferences: z
          .object({
            defaultAnimalId: z.string().optional(),
            defaultHouseholdId: z.string().optional(),
            defaultTimezone: z.string().optional(),
            displayPreferences: z
              .object({
                temperatureUnit: z.enum(["celsius", "fahrenheit"]).optional(),
                theme: z.enum(["system", "light", "dark"]).optional(),
                use24HourTime: z.boolean().optional(),
                weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
                weightUnit: z.enum(["kg", "lbs"]).optional(),
              })
              .optional(),
            emergencyContactName: z.string().optional(),
            emergencyContactPhone: z.string().optional(),
            notificationPreferences: z
              .object({
                emailReminders: z.boolean().optional(),
                pushNotifications: z.boolean().optional(),
                reminderLeadTime: z.number().optional(),
                smsReminders: z.boolean().optional(),
              })
              .optional(),
            preferredPhoneNumber: z.string().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Update preferences in database
      if (!ctx.dbUser.stackUserId) {
        throw new Error("User must have a Stack Auth ID to update preferences");
      }
      await updateUserPreferences(
        ctx.dbUser.stackUserId,
        {
          householdSettings: input.householdSettings,
          vetMedPreferences: input.vetMedPreferences as
            | Partial<VetMedPreferences>
            | undefined,
        },
        {
          householdId:
            ctx.currentHouseholdId || ctx.availableHouseholds[0]?.id || "",
          userId: ctx.dbUser.id,
        },
      );

      return { success: true };
    }),

  // Update user profile (flexible fields)
  updateProfile: protectedProcedure
    .input(
      z.object({
        bio: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        location: z.string().optional(),
        profileVisibility: z
          .object({
            bio: z.boolean().optional(),
            email: z.boolean().optional(),
            location: z.boolean().optional(),
            name: z.boolean().optional(),
            social: z.boolean().optional(),
          })
          .optional(),
        pronouns: z.string().optional(),
        socialLinks: z
          .object({
            custom: z
              .array(
                z.object({
                  label: z.string(),
                  url: z.url(),
                }),
              )
              .optional(),
            github: z.string().optional(),
            instagram: z.string().optional(),
            linkedin: z.string().optional(),
            twitter: z.string().optional(),
          })
          .optional(),
        website: z.url().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { db, dbUser } = ctx;

      // Update user profile in database
      const [updatedUser] = await db
        .update(users)
        .set({
          bio: input.bio !== undefined ? input.bio : dbUser.bio,
          firstName:
            input.firstName !== undefined ? input.firstName : dbUser.firstName,
          lastName:
            input.lastName !== undefined ? input.lastName : dbUser.lastName,
          location:
            input.location !== undefined ? input.location : dbUser.location,
          profileCompletedAt:
            dbUser.profileCompletedAt || new Date().toISOString(),
          profileVisibility:
            input.profileVisibility !== undefined
              ? input.profileVisibility
              : dbUser.profileVisibility,
          pronouns:
            input.pronouns !== undefined ? input.pronouns : dbUser.pronouns,
          socialLinks:
            input.socialLinks !== undefined
              ? input.socialLinks
              : dbUser.socialLinks,
          updatedAt: new Date().toISOString(),
          website: input.website !== undefined ? input.website : dbUser.website,
        })
        .where(eq(users.id, dbUser.id))
        .returning();

      return updatedUser;
    }),
});
