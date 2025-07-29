import type { Membership, User } from "../db/schema";

export interface Session {
	userId: string;
	user: User;
	householdMemberships: Membership[];
	expiresAt: Date;
}

export interface AuthProvider {
	/**
	 * Get session from request headers/cookies
	 */
	getSession(headers: Headers): Promise<Session | null>;

	/**
	 * Create a new session for a user
	 */
	createSession(userId: string): Promise<Session>;

	/**
	 * Invalidate a session
	 */
	invalidateSession(sessionId: string): Promise<void>;

	/**
	 * Verify user credentials (for email/password auth)
	 */
	verifyCredentials?(email: string, password: string): Promise<User | null>;

	/**
	 * Create a new user
	 */
	createUser?(email: string, password: string, name?: string): Promise<User>;
}

export interface AuthContext {
	session: Session | null;
	user: User | null;
	currentHouseholdId: string | null;
	currentMembership: Membership | null;
}
