import { MockAuthProvider } from "./mock-provider";
import { OpenAuthProvider } from "./openauth-provider";
import type { AuthProvider } from "./types";

export * from "./subjects";
// Export types
export * from "./types";

// Initialize the auth provider based on environment
let authProvider: AuthProvider;

if (process.env.OPENAUTH_ISSUER) {
	// OpenAuth is configured
	console.log("OpenAuth detected, initializing OpenAuth provider");
	authProvider = new OpenAuthProvider();
} else if (process.env.NEXT_PUBLIC_STACK_PROJECT_ID) {
	// Stack Auth is configured
	// TODO: Implement StackAuthProvider
	console.log("Stack Auth detected, using mock provider for now");
	authProvider = new MockAuthProvider();
} else if (process.env.NEXTAUTH_SECRET) {
	// NextAuth is configured
	// TODO: Implement NextAuthProvider
	console.log("NextAuth detected, using mock provider for now");
	authProvider = new MockAuthProvider();
} else {
	// Use mock provider for development
	console.log("Using mock auth provider for development");
	authProvider = new MockAuthProvider();
}

// Export singleton instance
export const auth = authProvider;

// Export OpenAuth provider instance if configured
export const openAuth =
	authProvider instanceof OpenAuthProvider ? authProvider : null;

// Helper to get auth context for tRPC
export async function getAuthContext(
	headers: Headers,
	householdId?: string | null,
) {
	const session = await auth.getSession(headers);

	if (!session) {
		return {
			session: null,
			user: null,
			currentHouseholdId: null,
			currentMembership: null,
		};
	}

	// Find the membership for the requested household
	const currentMembership = householdId
		? session.householdMemberships.find((m) => m.householdId === householdId)
		: session.householdMemberships[0]; // Default to first household

	return {
		session,
		user: session.user,
		currentHouseholdId: currentMembership?.householdId || null,
		currentMembership: currentMembership || null,
	};
}
