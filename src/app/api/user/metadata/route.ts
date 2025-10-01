import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stackServerApp } from "@/stack/server";

// Schema for VetMed preferences
const VetMedPreferencesSchema = z.object({
  defaultTimezone: z.string(),
  displayPreferences: z.object({
    temperatureUnit: z.enum(["celsius", "fahrenheit"]),
    use24HourTime: z.boolean(),
    weightUnit: z.enum(["kg", "lbs"]),
  }),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  notificationPreferences: z.object({
    emailReminders: z.boolean(),
    pushNotifications: z.boolean(),
    reminderLeadTime: z.number(),
    smsReminders: z.boolean(),
  }),
  preferredPhoneNumber: z.string().optional(),
});

// Schema for Household settings
const HouseholdSettingsSchema = z.object({
  defaultLocation: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    timezone: z.string(),
    zipCode: z.string().optional(),
  }),
  householdRoles: z.array(z.string()),
  inventoryPreferences: z.object({
    autoReorderEnabled: z.boolean(),
    expirationWarningDays: z.number(),
    lowStockThreshold: z.number(),
  }),
  preferredVeterinarian: z.object({
    address: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
  }),
  primaryHouseholdName: z.string(),
});

const UpdateMetadataSchema = z.object({
  householdSettings: HouseholdSettingsSchema.optional(),
  vetMedPreferences: VetMedPreferencesSchema.optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = UpdateMetadataSchema.parse(body);

    // Note: Database persistence is handled by tRPC user.updatePreferences mutation
    // This endpoint serves as a validation-only route for metadata structure
    // The actual database updates occur through the tRPC API with proper auth context

    return NextResponse.json({
      data: validatedData,
      message: "Metadata validated and processed successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error processing metadata:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          details: error.issues,
          error: "Invalid data format",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Here you could fetch user metadata from your database
    // For now, return a success response indicating the endpoint is working
    return NextResponse.json({
      message: "User metadata endpoint is accessible",
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
