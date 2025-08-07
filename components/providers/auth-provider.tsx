"use client";

import { useStackApp, useUser } from "@stackframe/stack";
import { createContext, type ReactNode, useContext } from "react";
import { trpc } from "@/server/trpc/client";

interface UserProfile {
	id: string;
	stackUserId: string | null;
	email: string | null;
	name: string | null;
	image: string | null;
	preferences: {
		timezone: string | null;
		phoneNumber: string | null;
		use24HourTime: boolean | null;
		temperatureUnit: string | null;
		weightUnit: string | null;
		emailReminders: boolean | null;
		smsReminders: boolean | null;
		pushNotifications: boolean | null;
		reminderLeadTime: string | null;
		emergencyContact: {
			name: string | null;
			phone: string | null;
		};
	};
	onboarding: {
		complete: boolean | null;
		completedAt: string | null;
	};
	availableHouseholds: Array<{
		id: string;
		name: string;
		timezone: string;
		createdAt: string;
		updatedAt: string;
		membership: {
			id: string;
			createdAt: string;
			updatedAt: string;
			householdId: string;
			userId: string;
			role: "OWNER" | "CAREGIVER" | "VETREADONLY";
		};
	}>;
	currentHouseholdId: string | null;
}

interface AuthContextValue {
	user: UserProfile | null | undefined;
	households: Array<{ id: string; name: string }>;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
	login: () => void;
	logout: () => Promise<void>;
	refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const user = useUser();
	const app = useStackApp();
	const isLoaded = true; // Stack Auth loads synchronously

	// Get user profile data from tRPC
	const {
		data: userProfile,
		isLoading: profileLoading,
		refetch,
	} = trpc.user.getProfile.useQuery(undefined, { enabled: !!user });

	const auth: AuthContextValue = {
		user: userProfile,
		households: userProfile?.availableHouseholds || [],
		isAuthenticated: !!user,
		isLoading: !isLoaded || profileLoading,
		error: null,
		login: () => app.redirectToSignIn(),
		logout: async () => {
			await user?.signOut();
		},
		refreshAuth: async () => {
			await refetch();
		},
	};

	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}

// Compatibility hook for components that need to check auth
export function useRequireAuth() {
	const { isAuthenticated, isLoading } = useAuth();
	return { isAuthenticated, isLoading };
}
