import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stackServerApp } from "@/stack";

// Schema for VetMed preferences
const VetMedPreferencesSchema = z.object({
	defaultTimezone: z.string(),
	preferredPhoneNumber: z.string().optional(),
	emergencyContactName: z.string().optional(),
	emergencyContactPhone: z.string().optional(),
	notificationPreferences: z.object({
		emailReminders: z.boolean(),
		smsReminders: z.boolean(),
		pushNotifications: z.boolean(),
		reminderLeadTime: z.number(),
	}),
	displayPreferences: z.object({
		use24HourTime: z.boolean(),
		temperatureUnit: z.enum(["celsius", "fahrenheit"]),
		weightUnit: z.enum(["kg", "lbs"]),
	}),
});

// Schema for Household settings
const HouseholdSettingsSchema = z.object({
	primaryHouseholdName: z.string(),
	defaultLocation: z.object({
		address: z.string().optional(),
		city: z.string().optional(),
		state: z.string().optional(),
		zipCode: z.string().optional(),
		timezone: z.string(),
	}),
	householdRoles: z.array(z.string()),
	preferredVeterinarian: z.object({
		name: z.string().optional(),
		phone: z.string().optional(),
		address: z.string().optional(),
	}),
	inventoryPreferences: z.object({
		lowStockThreshold: z.number(),
		autoReorderEnabled: z.boolean(),
		expirationWarningDays: z.number(),
	}),
});

const UpdateMetadataSchema = z.object({
	vetMedPreferences: VetMedPreferencesSchema.optional(),
	householdSettings: HouseholdSettingsSchema.optional(),
});

export async function POST(req: NextRequest) {
	try {
		const user = await stackServerApp.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await req.json();
		const validatedData = UpdateMetadataSchema.parse(body);

		// Here you could sync critical data to your database
		// For example, update user preferences that affect medication scheduling
		if (validatedData.vetMedPreferences?.defaultTimezone) {
			// Update user's timezone in the database for medication scheduling
			console.log(
				`Updating timezone for user ${user.id} to:`,
				validatedData.vetMedPreferences.defaultTimezone,
			);

			// TODO: Update database with timezone information
			// await db.users.update({
			//   where: { stackUserId: user.id },
			//   data: { timezone: validatedData.vetMedPreferences.defaultTimezone }
			// });
		}

		if (validatedData.householdSettings?.primaryHouseholdName) {
			// Sync household name to database
			console.log(
				`Updating household name for user ${user.id}:`,
				validatedData.householdSettings.primaryHouseholdName,
			);

			// TODO: Create or update household in database
			// await db.households.upsert({
			//   where: { primaryUserId: user.id },
			//   create: {
			//     name: validatedData.householdSettings.primaryHouseholdName,
			//     primaryUserId: user.id,
			//   },
			//   update: {
			//     name: validatedData.householdSettings.primaryHouseholdName,
			//   }
			// });
		}

		return NextResponse.json({
			success: true,
			message: "Metadata validated and processed successfully",
			data: validatedData,
		});
	} catch (error) {
		console.error("Error processing metadata:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					error: "Invalid data format",
					details: error.issues,
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
			success: true,
			userId: user.id,
			message: "User metadata endpoint is accessible",
		});
	} catch (error) {
		console.error("Error fetching metadata:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
