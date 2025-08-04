import type { User as ClerkUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { dbPooled as db } from "@/db/drizzle";
import { households, memberships, users } from "@/db/schema";
import { type ClerkUserData, syncUserToDatabase } from "../clerk-sync";

interface HouseholdWithMembership {
	id: string;
	name: string;
	timezone: string;
	createdAt: string;
	updatedAt: string;
	membership: typeof memberships.$inferSelect;
}

// Build ClerkUserData from Clerk user object
export function buildClerkUserData(
	userId: string,
	clerkUser: ClerkUser,
): ClerkUserData {
	return {
		userId,
		email: clerkUser.emailAddresses[0]?.emailAddress || "",
		name:
			clerkUser.firstName && clerkUser.lastName
				? `${clerkUser.firstName} ${clerkUser.lastName}`
				: clerkUser.firstName || clerkUser.username || undefined,
		image: clerkUser.imageUrl,
		vetMedPreferences: clerkUser.unsafeMetadata?.vetMedPreferences as
			| import("@/hooks/use-user-preferences").VetMedPreferences
			| undefined,
		householdSettings: clerkUser.unsafeMetadata?.householdSettings as
			| import("@/hooks/use-user-preferences").HouseholdSettings
			| undefined,
		onboardingComplete: clerkUser.publicMetadata?.onboardingComplete as boolean,
	};
}

// Get user's household memberships
export async function getUserHouseholds(
	userId: string,
): Promise<HouseholdWithMembership[]> {
	const userMemberships = await db
		.select({
			id: memberships.id,
			userId: memberships.userId,
			householdId: memberships.householdId,
			role: memberships.role,
			createdAt: memberships.createdAt,
			updatedAt: memberships.updatedAt,
			household: {
				id: households.id,
				name: households.name,
				timezone: households.timezone,
				createdAt: households.createdAt,
				updatedAt: households.updatedAt,
			},
		})
		.from(memberships)
		.innerJoin(households, eq(memberships.householdId, households.id))
		.where(eq(memberships.userId, userId));

	return userMemberships.map(({ household, ...membership }) => ({
		...household,
		membership,
	}));
}

// Determine current household from available households
export function determineCurrentHousehold(
	availableHouseholds: HouseholdWithMembership[],
	requestedHouseholdId: string | null,
): {
	currentHouseholdId: string | null;
	currentMembership: typeof memberships.$inferSelect | null;
} {
	let currentHouseholdId: string | null = null;
	let currentMembership: typeof memberships.$inferSelect | null = null;

	if (requestedHouseholdId) {
		// User requested specific household
		const requestedHousehold = availableHouseholds.find(
			(h) => h.id === requestedHouseholdId,
		);
		if (requestedHousehold) {
			currentHouseholdId = requestedHouseholdId;
			currentMembership = requestedHousehold.membership;
		}
	}

	// Fall back to first household if none specified or requested household not found
	if (!currentHouseholdId && availableHouseholds.length > 0) {
		const firstHousehold = availableHouseholds[0];
		if (firstHousehold) {
			currentHouseholdId = firstHousehold.id;
			currentMembership = firstHousehold.membership;
		}
	}

	return { currentHouseholdId, currentMembership };
}

// Create default household for new users
export async function createDefaultHousehold(
	dbUser: typeof users.$inferSelect,
	clerkUser: ClerkUser,
): Promise<{
	household: HouseholdWithMembership;
	householdId: string;
	membership: typeof memberships.$inferSelect;
}> {
	const householdSettings = clerkUser.unsafeMetadata?.householdSettings as
		| import("@/hooks/use-user-preferences").HouseholdSettings
		| undefined;
	const vetMedPreferences = clerkUser.unsafeMetadata?.vetMedPreferences as
		| import("@/hooks/use-user-preferences").VetMedPreferences
		| undefined;

	const defaultHouseholdName =
		householdSettings?.primaryHouseholdName ||
		`${clerkUser.firstName || "My"} Household`;

	const newHousehold = await db
		.insert(households)
		.values({
			name: defaultHouseholdName,
			timezone:
				vetMedPreferences?.defaultTimezone ||
				process.env.DEFAULT_TIMEZONE ||
				"America/New_York",
		})
		.returning();

	if (!dbUser?.id || !newHousehold[0]?.id) {
		throw new Error("Failed to create default household or user");
	}

	const newMembership = await db
		.insert(memberships)
		.values({
			userId: dbUser.id,
			householdId: newHousehold[0].id,
			role: "OWNER",
		})
		.returning();

	if (!newMembership[0]) {
		throw new Error("Failed to create membership");
	}

	return {
		household: {
			...newHousehold[0],
			membership: newMembership[0],
		},
		householdId: newHousehold[0].id,
		membership: newMembership[0],
	};
}

// Setup authenticated user context
export async function setupAuthenticatedUser(
	userId: string,
	clerkUser: ClerkUser,
): Promise<{
	dbUser: typeof users.$inferSelect;
	currentHouseholdId: string | null;
	currentMembership: typeof memberships.$inferSelect | null;
	availableHouseholds: HouseholdWithMembership[];
}> {
	// Check if user exists in the database
	let dbUser = await db.query.users.findFirst({
		where: eq(users.clerkUserId, userId),
	});

	// If user doesn't exist, sync them from Clerk
	if (!dbUser) {
		const clerkUserData = buildClerkUserData(userId, clerkUser);
		dbUser = await syncUserToDatabase(clerkUserData);
	}

	// Get user's household memberships
	let availableHouseholds = await getUserHouseholds(dbUser.id);

	// If user has no households, create a default one
	if (availableHouseholds.length === 0) {
		const { household, householdId, membership } = await createDefaultHousehold(
			dbUser,
			clerkUser,
		);
		availableHouseholds = [household];
		return {
			dbUser,
			currentHouseholdId: householdId,
			currentMembership: membership,
			availableHouseholds,
		};
	}

	return {
		dbUser,
		currentHouseholdId: null,
		currentMembership: null,
		availableHouseholds,
	};
}
