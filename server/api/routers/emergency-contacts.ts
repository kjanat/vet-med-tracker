import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { vetmedEmergencyContacts as emergencyContacts } from "@/db/schema-refactored";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const emergencyContactsRouter = createTRPCRouter({
  // Create a new emergency contact
  create: protectedProcedure
    .input(
      z.object({
        contactName: z.string().min(1, "Contact name is required"),
        contactPhone: z.string().min(1, "Phone number is required"),
        isPrimary: z.boolean().default(false),
        relationship: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // If setting as primary, unset other primary contacts
      if (input.isPrimary) {
        await ctx.db
          .update(emergencyContacts)
          .set({ isPrimary: false })
          .where(
            and(
              eq(emergencyContacts.userId, ctx.dbUser?.id || ""),
              eq(emergencyContacts.isPrimary, true),
            ),
          );
      }

      const [contact] = await ctx.db
        .insert(emergencyContacts)
        .values({
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          isPrimary: input.isPrimary,
          relationship: input.relationship,
          userId: ctx.dbUser?.id || "",
        })
        .returning();

      return contact;
    }),

  // Delete an emergency contact
  delete: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the contact belongs to the user
      const existingContact = await ctx.db
        .select({ id: emergencyContacts.id })
        .from(emergencyContacts)
        .where(
          and(
            eq(emergencyContacts.id, input.id),
            eq(emergencyContacts.userId, ctx.dbUser?.id || ""),
          ),
        )
        .limit(1);

      if (!existingContact[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Emergency contact not found",
        });
      }

      await ctx.db
        .delete(emergencyContacts)
        .where(eq(emergencyContacts.id, input.id));

      return { success: true };
    }),
  // Get all emergency contacts for the current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const contacts = await ctx.db
      .select({
        contactName: emergencyContacts.contactName,
        contactPhone: emergencyContacts.contactPhone,
        createdAt: emergencyContacts.createdAt,
        id: emergencyContacts.id,
        isPrimary: emergencyContacts.isPrimary,
        relationship: emergencyContacts.relationship,
        updatedAt: emergencyContacts.updatedAt,
      })
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, ctx.dbUser?.id || ""))
      .orderBy(emergencyContacts.isPrimary, emergencyContacts.contactName);

    return contacts;
  }),

  // Get primary emergency contact (quick access)
  primary: protectedProcedure.query(async ({ ctx }) => {
    const [contact] = await ctx.db
      .select({
        contactName: emergencyContacts.contactName,
        contactPhone: emergencyContacts.contactPhone,
        id: emergencyContacts.id,
        relationship: emergencyContacts.relationship,
      })
      .from(emergencyContacts)
      .where(
        and(
          eq(emergencyContacts.userId, ctx.dbUser?.id || ""),
          eq(emergencyContacts.isPrimary, true),
        ),
      )
      .limit(1);

    return contact || null;
  }),

  // Update an emergency contact
  update: protectedProcedure
    .input(
      z.object({
        contactName: z.string().min(1, "Contact name is required"),
        contactPhone: z.string().min(1, "Phone number is required"),
        id: z.uuid(),
        isPrimary: z.boolean().default(false),
        relationship: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the contact belongs to the user
      const existingContact = await ctx.db
        .select({ id: emergencyContacts.id })
        .from(emergencyContacts)
        .where(
          and(
            eq(emergencyContacts.id, input.id),
            eq(emergencyContacts.userId, ctx.dbUser?.id || ""),
          ),
        )
        .limit(1);

      if (!existingContact[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Emergency contact not found",
        });
      }

      // If setting as primary, unset other primary contacts
      if (input.isPrimary) {
        await ctx.db
          .update(emergencyContacts)
          .set({ isPrimary: false })
          .where(
            and(
              eq(emergencyContacts.userId, ctx.dbUser?.id || ""),
              eq(emergencyContacts.isPrimary, true),
            ),
          );
      }

      const [updatedContact] = await ctx.db
        .update(emergencyContacts)
        .set({
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          isPrimary: input.isPrimary,
          relationship: input.relationship,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(emergencyContacts.id, input.id))
        .returning();

      return updatedContact;
    }),
});
