import { createClient } from "@openauthjs/openauth/client";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "../db";
import type { User } from "../db/schema";
import { auditLog, households, memberships, users } from "../db/schema";
import { AUTH_COOKIES, SESSION_DURATION } from "./constants";
import { subjects } from "./subjects";
import type { AuthProvider, Session } from "./types";

interface PKCEChallenge {
	verifier: string;
	[key: string]: unknown;
}

export class OpenAuthProvider implements AuthProvider {
	private client;

	constructor() {
		const issuer = process.env.OPENAUTH_ISSUER;
		const clientId = process.env.OPENAUTH_CLIENT_ID || "vetmed-tracker";
		const clientSecret = process.env.OPENAUTH_CLIENT_SECRET;

		if (!issuer) {
			throw new Error("OPENAUTH_ISSUER environment variable is required");
		}

		// OpenAuth client initialized

		this.client = createClient({
			clientID: clientId,
			issuer,
			// Force PKCE for better security
			pkce: true,
		});
	}

	async getSession(_headers: Headers): Promise<Session | null> {
		try {
			// Get cookies from the request
			const cookieStore = await cookies();
			const accessToken = cookieStore.get(AUTH_COOKIES.ACCESS_TOKEN)?.value;
			const refreshToken = cookieStore.get(AUTH_COOKIES.REFRESH_TOKEN)?.value;

			if (!accessToken) {
				return null;
			}

			// Don't use the subjects from this file - the server uses different subjects
			// We need to verify with a simple schema that matches what the server sends
			const { createSubjects } = await import("@openauthjs/openauth");
			const { z } = await import("zod");

			const serverSubjects = createSubjects({
				user: z.object({
					id: z.string(),
					email: z.string().email(),
				}),
			});

			// Verify the access token
			const verified = await this.client.verify(serverSubjects, accessToken, {
				refresh: refreshToken,
			});

			if (verified.err || !verified.subject) {
				return null;
			}

			// If tokens were refreshed, update cookies
			if (verified.tokens) {
				await this.setAuthCookies(
					verified.tokens.access,
					verified.tokens.refresh,
				);
			}

			const userSubject = verified.subject.properties;

			// Fetch the user from database to ensure it exists
			const user = await db.query.users.findFirst({
				where: eq(users.id, userSubject.id), // Use 'id' not 'userId'
			});

			if (!user) {
				// User doesn't exist in our database, clear cookies
				await this.clearAuthCookies();
				return null;
			}

			// Fetch current household memberships from database
			// This ensures we have the latest membership data
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
			// Check both the error message and the cause
			if (error instanceof Error) {
				const errorMessage = error.message || "";
				const causeMessage = (error as any).cause?.message || "";

				if (
					(errorMessage.includes("relation") &&
						errorMessage.includes("does not exist")) ||
					(causeMessage.includes("relation") &&
						causeMessage.includes("does not exist"))
				) {
					throw error;
				}
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
				// The challenge object should contain the verifier
				// Try to access it directly or as a property
				if (typeof result.challenge === "object" && result.challenge !== null) {
					// Type assertion to access the verifier property
					const challenge = result.challenge as PKCEChallenge;
					codeVerifier = challenge.verifier;
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

	// Helper to create or update user from OpenAuth token
	async createOrUpdateUser(accessToken: string): Promise<User> {
		// Don't use the subjects from this file - the server uses different subjects
		// We need to verify with a simple schema that matches what the server sends
		const { createSubjects } = await import("@openauthjs/openauth");
		const { z } = await import("zod");

		const serverSubjects = createSubjects({
			user: z.object({
				id: z.string(),
				email: z.string().email(),
			}),
		});

		const verified = await this.client.verify(serverSubjects, accessToken);

		if (verified.err || !verified.subject) {
			console.error("Token verification failed:", verified.err);
			throw new Error("Invalid access token");
		}

		const userSubject = verified.subject.properties;

		// Check if user exists
		let user = await db.query.users.findFirst({
			where: eq(users.id, userSubject.id), // Use 'id' not 'userId'
		});

		if (!user) {
			// Wrap in transaction for atomicity
			await db.transaction(async (tx) => {
				// Create new user
				const [newUser] = await tx
					.insert(users)
					.values({
						id: userSubject.id, // Use 'id' not 'userId'
						email: userSubject.email,
						name: userSubject.email.split("@")[0], // Simple default name
						emailVerified: new Date(), // Assume verified through OpenAuth
					})
					.returning();

				if (!newUser) {
					throw new Error("Failed to create user");
				}

				user = newUser;

				// Create default household for new user
				const [household] = await tx
					.insert(households)
					.values({
						name: `${user.name}'s Household`,
						timezone: process.env.DEFAULT_TIMEZONE || "UTC",
					})
					.returning();

				if (!household) {
					throw new Error("Failed to create household");
				}

				// Create membership
				await tx.insert(memberships).values({
					userId: user.id,
					householdId: household.id,
					role: "OWNER",
				});

				// Audit log the user creation
				await tx.insert(auditLog).values({
					userId: user.id,
					householdId: household.id,
					action: "CREATE",
					resourceType: "user",
					resourceId: user.id,
					newValues: {
						email: user.email,
						name: user.name,
						source: "openauth",
					},
					details: {
						household_created: household.id,
						membership_role: "OWNER",
					},
				});
			});
		}

		return user;
	}
}
