import { createClient } from "@openauthjs/openauth/client";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "../db";
import type { User } from "../db/schema";
import { auditLog, households, memberships, users } from "../db/schema";
import { AUTH_COOKIES, SESSION_DURATION } from "./constants";
import type { AuthProvider, Session } from "./types";

interface PKCEChallenge {
	verifier: string;
	[key: string]: unknown;
}

// Type guard for PKCE challenge validation
function isPKCEChallenge(value: unknown): value is PKCEChallenge {
	return (
		!!value &&
		typeof value === "object" &&
		"verifier" in value &&
		typeof (value as PKCEChallenge).verifier === "string"
	);
}

export class OpenAuthProvider implements AuthProvider {
	private client;

	constructor() {
		const issuer = process.env.OPENAUTH_ISSUER;
		const clientId = process.env.OPENAUTH_CLIENT_ID || "vetmed-tracker";

		if (!issuer) {
			throw new Error("OPENAUTH_ISSUER environment variable is required");
		}

		// OpenAuth client initialized
		// Note: PKCE is enabled per-request in the authorize method
		this.client = createClient({
			clientID: clientId,
			issuer,
		});
	}

	// Helper to create server subjects for token verification
	private async getServerSubjects() {
		const { createSubjects } = await import("@openauthjs/openauth");
		const { z } = await import("zod");

		return createSubjects({
			user: z.object({
				id: z.string(),
				email: z.string().email(),
			}),
		});
	}

	// Helper to check if error is a database error
	private isDatabaseError(error: unknown): boolean {
		if (!(error instanceof Error)) return false;

		const errorMessage = error.message || "";
		const errorWithCause = error as Error & {
			cause?: { message?: string };
		};
		const causeMessage = errorWithCause.cause?.message || "";

		return (
			(errorMessage.includes("relation") &&
				errorMessage.includes("does not exist")) ||
			(causeMessage.includes("relation") &&
				causeMessage.includes("does not exist"))
		);
	}

	async getSession(_headers: Headers): Promise<Session | null> {
		try {
			// Get auth tokens from cookies
			const cookieStore = await cookies();
			const accessToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
			const refreshToken = cookieStore.get(AUTH_COOKIES.REFRESH_TOKEN)?.value;

			if (!accessToken) {
				return null;
			}

			// Verify the access token
			const serverSubjects = await this.getServerSubjects();
			const verified = await this.client.verify(serverSubjects, accessToken, {
				refresh: refreshToken,
			});

			if (verified.err || !verified.subject) {
				return null;
			}

			// Update cookies if tokens were refreshed
			if (verified.tokens) {
				await this.setAuthCookies(
					verified.tokens.access,
					verified.tokens.refresh,
				);
			}

			// Fetch user and memberships from database
			const userSubject = verified.subject.properties;
			const user = await db.query.users.findFirst({
				where: eq(users.id, userSubject.id),
			});

			if (!user) {
				// User doesn't exist in our database, clear cookies
				await this.clearAuthCookies();
				return null;
			}

			const userMemberships = await db.query.memberships.findMany({
				where: eq(memberships.userId, user.id),
			});

			return {
				userId: user.id,
				user,
				householdMemberships: userMemberships,
				expiresAt: new Date(Date.now() + SESSION_DURATION.ACCESS_TOKEN * 1000),
			};
		} catch (error) {
			console.error("Error verifying session:", error);

			// Re-throw database errors so they can be handled properly
			if (this.isDatabaseError(error)) {
				throw error;
			}

			// For other errors, return null (not authenticated)
			return null;
		}
	}

	async createSession(_userId: string): Promise<Session> {
		// This method is not directly used with OpenAuth
		// Sessions are created through the OAuth flow
		throw new Error("Sessions are created through OAuth flow, not directly");
	}

	async invalidateSession(_sessionId: string): Promise<void> {
		// Clear auth cookies to log out
		await this.clearAuthCookies();
	}

	// Helper methods for cookie management
	private async setAuthCookies(accessToken: string, refreshToken: string) {
		const cookieStore = await cookies();
		const isProduction = process.env.NODE_ENV === "production";

		// Set access token cookie
		cookieStore.set(AUTH_COOKIES.ACCESS_TOKEN, accessToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});

		// Set refresh token cookie
		cookieStore.set(AUTH_COOKIES.REFRESH_TOKEN, refreshToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 30, // 30 days
		});
	}

	private async clearAuthCookies() {
		const cookieStore = await cookies();
		cookieStore.delete(AUTH_COOKIES.ACCESS_TOKEN);
		cookieStore.delete(AUTH_COOKIES.REFRESH_TOKEN);
	}

	// OAuth-specific methods
	async getAuthorizeUrl(
		redirectUri: string,
		state?: string,
	): Promise<{ url: string; codeVerifier?: string }> {
		try {
			// Generate authorization URL with PKCE enabled
			const result = await this.client.authorize(redirectUri, "code", {
				pkce: true,
			});

			if (!result || !result.url) {
				throw new Error("Failed to generate authorization URL");
			}

			// For PKCE flow, we need to extract the verifier from the challenge
			let codeVerifier: string | undefined;
			if (result.challenge) {
				if (isPKCEChallenge(result.challenge)) {
					codeVerifier = result.challenge.verifier;
				} else {
					console.error("Invalid PKCE challenge structure:", result.challenge);
					throw new Error("Invalid PKCE challenge from OpenAuth provider");
				}
			}

			// If we have our own state, use it instead of OpenAuth's
			if (state) {
				const authUrl = new URL(result.url);
				authUrl.searchParams.set("state", state);
				return {
					url: authUrl.toString(),
					codeVerifier,
				};
			}

			return {
				url: result.url,
				codeVerifier,
			};
		} catch (error) {
			console.error("Error generating authorize URL:", error);
			throw error;
		}
	}

	async exchangeCode(
		code: string,
		redirectUri: string,
		codeVerifier?: string,
	): Promise<{ accessToken: string; refreshToken: string }> {
		try {
			const result = await this.client.exchange(
				code,
				redirectUri,
				codeVerifier,
			);

			if (result.err) {
				console.error("Exchange error:", result.err);
				throw new Error(
					`Failed to exchange authorization code: ${result.err.message || "Unknown error"}`,
				);
			}

			const { access, refresh } = result.tokens;

			// Set cookies with the new tokens
			await this.setAuthCookies(access, refresh);

			return {
				accessToken: access,
				refreshToken: refresh,
			};
		} catch (error) {
			console.error("Token exchange failed:", error);
			throw error;
		}
	}

	// Helper to create a new user with household
	private async createUserWithHousehold(userSubject: {
		id: string;
		email: string;
	}): Promise<User> {
		return await db.transaction(async (tx) => {
			// Create new user
			const [newUser] = await tx
				.insert(users)
				.values({
					id: userSubject.id,
					email: userSubject.email,
					name: userSubject.email.split("@")[0], // Simple default name
					emailVerified: new Date(), // Assume verified through OpenAuth
				})
				.returning();

			if (!newUser) {
				throw new Error("Failed to create user");
			}

			// Create default household for new user
			const [household] = await tx
				.insert(households)
				.values({
					name: `${newUser.name}'s Household`,
					timezone: process.env.DEFAULT_TIMEZONE || "UTC",
				})
				.returning();

			if (!household) {
				throw new Error("Failed to create household");
			}

			// Create membership
			await tx.insert(memberships).values({
				userId: newUser.id,
				householdId: household.id,
				role: "OWNER",
			});

			// Audit log the user creation
			await tx.insert(auditLog).values({
				userId: newUser.id,
				householdId: household.id,
				action: "CREATE",
				resourceType: "user",
				resourceId: newUser.id,
				newValues: {
					email: newUser.email,
					name: newUser.name,
					source: "openauth",
				},
				details: {
					household_created: household.id,
					membership_role: "OWNER",
				},
			});

			return newUser;
		});
	}

	// Helper to create or update user from OpenAuth token
	async createOrUpdateUser(accessToken: string): Promise<User> {
		// Verify the access token
		const serverSubjects = await this.getServerSubjects();
		const verified = await this.client.verify(serverSubjects, accessToken);

		if (verified.err || !verified.subject) {
			console.error("Token verification failed:", verified.err);
			throw new Error("Invalid access token");
		}

		const userSubject = verified.subject.properties;

		// Check if user exists
		let user = await db.query.users.findFirst({
			where: eq(users.id, userSubject.id),
		});

		// Create user if doesn't exist
		if (!user) {
			user = await this.createUserWithHousehold(userSubject);
		}

		return user;
	}
}
