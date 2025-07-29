import { eq } from "drizzle-orm";
import { db } from "../db";
import type { Membership, User } from "../db/schema";
import { memberships, users } from "../db/schema";
import type { AuthProvider, Session } from "./types";

/**
 * Mock authentication provider for development
 * This simulates authentication without requiring real auth setup
 */
export class MockAuthProvider implements AuthProvider {
	private mockSessions = new Map<string, Session>();

	constructor() {
		// Initialize with a mock session for development
		this.initializeMockData();
	}

	private async initializeMockData() {
		try {
			// Check if mock user exists
			const existingUser = await db.query.users.findFirst({
				where: eq(users.email, "dev@vetmed.local"),
			});

			if (!existingUser) {
				// Create mock user and household for development
				console.log("Creating mock development user and household...");

				// This would normally be done through proper user registration
				// For now, we'll just log that it needs to be created
				console.log("Run database migrations to create initial data");
			}
		} catch (error) {
			console.warn("Could not initialize mock data:", error);
		}
	}

	async getSession(headers: Headers): Promise<Session | null> {
		// In development, always return a mock session
		if (process.env.NODE_ENV === "development") {
			const mockUserId = process.env.MOCK_USER_ID || "dev-user-1";
			const mockSessionId = "dev-session-1";

			// Check if we have a cached mock session
			const cachedSession = this.mockSessions.get(mockSessionId);
			if (cachedSession && cachedSession.expiresAt > new Date()) {
				return cachedSession;
			}

			// Create a new mock session
			return this.createSession(mockUserId);
		}

		// In production, this would parse cookies/headers for real auth
		const sessionToken = headers.get("authorization")?.replace("Bearer ", "");
		if (!sessionToken) {
			return null;
		}

		// TODO: Implement real session lookup
		return null;
	}

	async createSession(userId: string): Promise<Session> {
		try {
			// Fetch user from database
			const user = await db.query.users.findFirst({
				where: eq(users.id, userId),
			});

			if (!user) {
				// For development, create a mock user object
				const mockUser: User = {
					id: userId,
					email: "dev@vetmed.local",
					name: "Dev User",
					emailVerified: new Date(),
					image: null,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				// Create mock memberships
				const mockMemberships: Membership[] = [
					{
						id: "mock-membership-1",
						userId: userId,
						householdId: "household-1",
						role: "OWNER",
						joinedAt: new Date(),
						invitedBy: null,
						invitedAt: null,
					},
				];

				const session: Session = {
					userId,
					user: mockUser,
					householdMemberships: mockMemberships,
					expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
				};

				// Cache the session
				this.mockSessions.set("dev-session-1", session);

				return session;
			}

			// Fetch user's household memberships
			const userMemberships = await db.query.memberships.findMany({
				where: eq(memberships.userId, userId),
			});

			const session: Session = {
				userId,
				user,
				householdMemberships: userMemberships,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
			};

			// Cache the session
			const sessionId = `session-${Date.now()}`;
			this.mockSessions.set(sessionId, session);

			return session;
		} catch (error) {
			console.error("Error creating session:", error);

			// Return a basic mock session for development
			const mockUser: User = {
				id: userId,
				email: "dev@vetmed.local",
				name: "Dev User",
				emailVerified: new Date(),
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			return {
				userId,
				user: mockUser,
				householdMemberships: [],
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			};
		}
	}

	async invalidateSession(sessionId: string): Promise<void> {
		this.mockSessions.delete(sessionId);
	}

	async verifyCredentials(
		email: string,
		_password: string,
	): Promise<User | null> {
		// In development, accept any credentials
		if (process.env.NODE_ENV === "development") {
			return {
				id: "dev-user-1",
				email,
				name: "Dev User",
				emailVerified: new Date(),
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
		}

		// TODO: Implement real credential verification
		return null;
	}

	async createUser(
		email: string,
		_password: string,
		name?: string,
	): Promise<User> {
		// In development, return a mock user
		if (process.env.NODE_ENV === "development") {
			return {
				id: `user-${Date.now()}`,
				email,
				name: name || email.split("@")[0],
				emailVerified: new Date(),
				image: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};
		}

		// TODO: Implement real user creation
		throw new Error("User creation not implemented");
	}
}
