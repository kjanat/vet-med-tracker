"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { createContext, type ReactNode, useContext } from "react";
import { trpc } from "@/lib/trpc/client";

interface UserProfile {
	id: string;
	clerkUserId: string | null;
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
	const { user, isLoaded } = useUser();
	const { openSignIn, signOut } = useClerk();

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
		login: () => openSignIn(),
		logout: async () => {
			await signOut();
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
