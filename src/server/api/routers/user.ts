import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  vetmedAnimals as animals,
  vetmedHouseholds as households,
  vetmedMemberships as memberships,
  type UserPreferencesSchema,
  type UserProfileSchema,
  vetmedUsers as users,
} from "@/db/schema";
import {
  defaultUserPreferences,
  defaultUserProfile,
} from "@/db/schema/user-defaults";
import type { VetMedPreferences } from "@/hooks/shared/use-user-preferences";
import { createTRPCRouter, protectedProcedure } from "../trpc";

// Helper function
function mergeUserPreferences(
  currentPreferences: UserPreferencesSchema | null,
  vetPrefs: Partial<VetMedPreferences> | undefined,
  dbUser: { defaultAnimalId: string | null; defaultHouseholdId: string | null },
): UserPreferencesSchema {
  const current: UserPreferencesSchema = currentPreferences
    ? structuredClone(currentPreferences)
    : structuredClone(defaultUserPreferences);

  return {
    ...current,
    defaultAnimalId:
      vetPrefs?.defaultAnimalId ??
      current.defaultAnimalId ??
      dbUser.defaultAnimalId ??
      null,
    defaultHouseholdId:
      vetPrefs?.defaultHouseholdId ??
      current.defaultHouseholdId ??
      dbUser.defaultHouseholdId ??
      null,
    defaultTimezone: vetPrefs?.defaultTimezone ?? current.defaultTimezone,
    displayPreferences: {
      ...current.displayPreferences,
      ...(vetPrefs?.displayPreferences ?? {}),
    },
    emergencyContactName:
      vetPrefs?.emergencyContactName ?? current.emergencyContactName,
    emergencyContactPhone:
      vetPrefs?.emergencyContactPhone ?? current.emergencyContactPhone,
    legacyBackup: current.legacyBackup ?? null,
    notificationPreferences: {
      ...current.notificationPreferences,
      ...(vetPrefs?.notificationPreferences ?? {}),
      reminderLeadTime:
        vetPrefs?.notificationPreferences?.reminderLeadTime ??
        current.notificationPreferences.reminderLeadTime,
    },
    preferredPhoneNumber:
      vetPrefs?.preferredPhoneNumber ?? current.preferredPhoneNumber,
  };
}

export const userRouter = createTRPCRouter({
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

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const preferences: UserPreferencesSchema = ctx.dbUser.preferences
      ? structuredClone(ctx.dbUser.preferences)
      : structuredClone(defaultUserPreferences);
    const profile: UserProfileSchema = ctx.dbUser.profile
      ? structuredClone(ctx.dbUser.profile)
      : structuredClone(defaultUserProfile);

    const displayPreferences = {
      ...defaultUserPreferences.displayPreferences,
      ...preferences.displayPreferences,
    };

    const notificationPreferences = {
      ...defaultUserPreferences.notificationPreferences,
      ...preferences.notificationPreferences,
    };

    const profileVisibility = {
      ...defaultUserProfile.profileVisibility,
      ...profile.profileVisibility,
    };

    return {
      availableHouseholds: ctx.availableHouseholds,
      bio: profile.bio,
      currentHouseholdId: ctx.currentHouseholdId,
      email: ctx.dbUser.email,
      firstName: profile.firstName,
      id: ctx.dbUser.id,
      image: ctx.dbUser.image,
      lastName: profile.lastName,
      location: profile.location,
      name: ctx.dbUser.name,
      onboarding: {
        complete: ctx.dbUser.onboardingComplete,
        completedAt: ctx.dbUser.onboardingCompletedAt,
      },
      preferences: {
        defaultAnimalId:
          preferences.defaultAnimalId ?? ctx.dbUser.defaultAnimalId,
        defaultHouseholdId:
          preferences.defaultHouseholdId ?? ctx.dbUser.defaultHouseholdId,
        emailReminders: notificationPreferences.emailReminders,
        emergencyContact: {
          name: preferences.emergencyContactName,
          phone: preferences.emergencyContactPhone,
        },
        phoneNumber: preferences.preferredPhoneNumber,
        pushNotifications: notificationPreferences.pushNotifications,
        reminderLeadTime: notificationPreferences.reminderLeadTime.toString(),
        smsReminders: notificationPreferences.smsReminders,
        temperatureUnit: displayPreferences.temperatureUnit,
        theme: displayPreferences.theme,
        timezone: preferences.defaultTimezone,
        use24HourTime: displayPreferences.use24HourTime,
        weekStartsOn: displayPreferences.weekStartsOn,
        weightUnit: displayPreferences.weightUnit,
      },
      profileCompletedAt: profile.profileCompletedAt,
      profileData: profile.legacyProfileData ?? {},
      profileVisibility,
      pronouns: profile.pronouns,
      socialLinks: profile.socialLinks ?? {},
      stackUserId: ctx.dbUser.stackUserId,
      website: profile.website,
    };
  }),

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
      if (!ctx.dbUser.stackUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User must have a Stack Auth ID to update preferences",
        });
      }

      const vetPrefs = input.vetMedPreferences as
        | Partial<VetMedPreferences>
        | undefined;

      const mergedPreferences = mergeUserPreferences(
        ctx.dbUser.preferences,
        vetPrefs,
        ctx.dbUser,
      );

      const updatePayload: Partial<typeof users.$inferInsert> = {
        preferences: mergedPreferences,
      };

      if (vetPrefs?.defaultHouseholdId !== undefined) {
        updatePayload.defaultHouseholdId = vetPrefs.defaultHouseholdId ?? null;
      }

      if (vetPrefs?.defaultAnimalId !== undefined) {
        updatePayload.defaultAnimalId = vetPrefs.defaultAnimalId ?? null;
      }

      await ctx.db
        .update(users)
        .set(updatePayload)
        .where(eq(users.id, ctx.dbUser.id));

      return { success: true };
    }),

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

      const currentProfile: UserProfileSchema = dbUser.profile
        ? structuredClone(dbUser.profile)
        : structuredClone(defaultUserProfile);

      const profileVisibility = input.profileVisibility
        ? {
            ...currentProfile.profileVisibility,
            ...input.profileVisibility,
          }
        : (currentProfile.profileVisibility ??
          defaultUserProfile.profileVisibility);

      const mergedProfile: UserProfileSchema = {
        ...currentProfile,
        bio: input.bio ?? currentProfile.bio,
        firstName: input.firstName ?? currentProfile.firstName,
        lastName: input.lastName ?? currentProfile.lastName,
        legacyProfileData: currentProfile.legacyProfileData ?? null,
        location: input.location ?? currentProfile.location,
        profileCompletedAt:
          currentProfile.profileCompletedAt || new Date().toISOString(),
        profileVisibility,
        pronouns: input.pronouns ?? currentProfile.pronouns,
        socialLinks: (input.socialLinks ??
          currentProfile.socialLinks ??
          {}) as Record<string, string>,
        website: input.website ?? currentProfile.website,
      };

      const [updatedUser] = await db
        .update(users)
        .set({
          profile: mergedProfile,
        })
        .where(eq(users.id, dbUser.id))
        .returning();

      return updatedUser;
    }),
});
