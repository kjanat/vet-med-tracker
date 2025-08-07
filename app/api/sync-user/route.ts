import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type {
	HouseholdSettings,
	VetMedPreferences,
} from "@/hooks/shared/use-user-preferences";
import type { ClerkUserData } from "@/server/api/clerk-sync";
import { syncUserToDatabase } from "@/server/api/clerk-sync";

export async function POST() {
	try {
		// Get Clerk auth context
		const authResult = await auth();
		const clerkUser = await currentUser();

		if (!authResult?.userId || !clerkUser) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		// Prepare user data for sync
		const clerkUserData: ClerkUserData = {
			userId: authResult.userId,
			email: clerkUser.emailAddresses[0]?.emailAddress || "",
			name:
				clerkUser.firstName && clerkUser.lastName
					? `${clerkUser.firstName} ${clerkUser.lastName}`
					: clerkUser.firstName || clerkUser.username || undefined,
			firstName: clerkUser.firstName || undefined,
			lastName: clerkUser.lastName || undefined,
			image: clerkUser.imageUrl,
			vetMedPreferences: clerkUser.unsafeMetadata?.vetMedPreferences as
				| VetMedPreferences
				| undefined,
			householdSettings: clerkUser.unsafeMetadata?.householdSettings as
				| HouseholdSettings
				| undefined,
			onboardingComplete: clerkUser.publicMetadata
				?.onboardingComplete as boolean,
		};

		// Sync user to database
		const dbUser = await syncUserToDatabase(clerkUserData);

		return NextResponse.json({
			success: true,
			message: "User synced successfully",
			user: {
				id: dbUser.id,
				clerkUserId: dbUser.clerkUserId,
				email: dbUser.email,
				name: dbUser.name,
			},
		});
	} catch (error) {
		console.error("Manual sync error:", error);
		return NextResponse.json(
			{
				error: "Failed to sync user",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

export async function GET() {
	// GET method to check sync status
	try {
		const authResult = await auth();
		const clerkUser = await currentUser();

		if (!authResult?.userId || !clerkUser) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		// Check if user exists in database
		const { db } = await import("@/db/drizzle");
		const { users } = await import("@/db/schema");
		const { eq } = await import("drizzle-orm");

		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.clerkUserId, authResult.userId))
			.limit(1);

		return NextResponse.json({
			clerkUser: {
				id: authResult.userId,
				email: clerkUser.emailAddresses[0]?.emailAddress,
				name: clerkUser.firstName,
			},
			dbUser: existingUser[0] || null,
			synced: existingUser.length > 0,
		});
	} catch (error) {
		console.error("Sync status check error:", error);
		return NextResponse.json(
			{
				error: "Failed to check sync status",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
