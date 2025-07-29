import { createClient } from "@openauthjs/openauth/client";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "../db";
import type { User } from "../db/schema";
import { memberships, users } from "../db/schema";
import { subjects } from "./subjects";
import type { AuthProvider, Session } from "./types";

const ACCESS_TOKEN_COOKIE = "vetmed-access-token";
const REFRESH_TOKEN_COOKIE = "vetmed-refresh-token";

export class OpenAuthProvider implements AuthProvider {
	private client;

	constructor() {
		const issuer = process.env.OPENAUTH_ISSUER;
		const clientId = process.env.OPENAUTH_CLIENT_ID || "vetmed-tracker";

		if (!issuer) {
			throw new Error("OPENAUTH_ISSUER environment variable is required");
		}

		console.log("Initializing OpenAuth client with:", { issuer, clientId });

		this.client = createClient({
			clientID: clientId,
			issuer,
		});
	}

	async getSession(_headers: Headers): Promise<Session | null> {
		try {
			// Get cookies from the request
			const cookieStore = await cookies();
			const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
			const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

			if (!accessToken) {
				return null;
			}

			// Verify the access token
			const verified = await this.client.verify(subjects, accessToken, {
				refresh: refreshToken,
			});

			if (!verified.subject) {
				return null;
			}

			// If tokens were refreshed, update cookies
			if (verified.access && verified.refresh) {
				await this.setAuthCookies(verified.access, verified.refresh);
			}

			const userSubject = verified.subject.properties;

			// Fetch the user from database to ensure it exists
			const user = await db.query.users.findFirst({
				where: eq(users.id, userSubject.userId),
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
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
			};
		} catch (error) {
			console.error("Error verifying session:", error);
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
		cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});

		// Set refresh token cookie
		cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 30, // 30 days
		});
	}

	private async clearAuthCookies() {
		const cookieStore = await cookies();
		cookieStore.delete(ACCESS_TOKEN_COOKIE);
		cookieStore.delete(REFRESH_TOKEN_COOKIE);
	}

	// OAuth-specific methods
	async getAuthorizeUrl(redirectUri: string, state?: string): Promise<string> {
		try {
			// For server-side flow, we don't use PKCE
			const result = await this.client.authorize(redirectUri, "code");

			console.log("Authorize result:", result);

			if (!result || !result.url) {
				throw new Error("Failed to generate authorization URL");
			}

			// The state is already included in the URL by OpenAuth
			// If we provided our own state, verify it matches
			if (state && result.challenge?.state !== state) {
				// Use the OpenAuth-generated state instead
				const authUrl = new URL(result.url);
				authUrl.searchParams.set("state", state);
				return authUrl.toString();
			}

			return result.url;
		} catch (error) {
			console.error("Error generating authorize URL:", error);
			throw error;
		}
	}

	async exchangeCode(
		code: string,
		redirectUri: string,
	): Promise<{ accessToken: string; refreshToken: string }> {
		const tokens = await this.client.exchange(code, redirectUri);

		if (!tokens.access || !tokens.refresh) {
			throw new Error("Failed to exchange authorization code");
		}

		// Set cookies with the new tokens
		await this.setAuthCookies(tokens.access, tokens.refresh);

		return {
			accessToken: tokens.access,
			refreshToken: tokens.refresh,
		};
	}

	// Helper to create or update user from OpenAuth token
	async createOrUpdateUser(accessToken: string): Promise<User> {
		const verified = await this.client.verify(subjects, accessToken);

		if (!verified.subject) {
			throw new Error("Invalid access token");
		}

		const userSubject = verified.subject.properties;

		// Check if user exists
		let user = await db.query.users.findFirst({
			where: eq(users.id, userSubject.userId),
		});

		if (!user) {
			// Create new user
			const [newUser] = await db
				.insert(users)
				.values({
					id: userSubject.userId,
					email: userSubject.email,
					name: userSubject.name || userSubject.email.split("@")[0],
					emailVerified: new Date(), // Assume verified through OpenAuth
				})
				.returning();

			user = newUser;

			// Create default household for new user
			const { households } = await import("../db/schema");
			const [household] = await db
				.insert(households)
				.values({
					name: `${user.name}'s Household`,
					timezone: "America/New_York", // Default timezone
				})
				.returning();

			// Create membership
			await db.insert(memberships).values({
				userId: user.id,
				householdId: household.id,
				role: "OWNER",
			});
		}

		return user;
	}
}
