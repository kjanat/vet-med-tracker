"use client";

import { useUser } from "@stackframe/stack";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
	type HouseholdSettings,
	useUserPreferences,
	type VetMedPreferences,
} from "@/hooks/shared/use-user-preferences";

interface UserPreferencesContextType {
	isLoaded: boolean;
	vetMedPreferences: VetMedPreferences;
	householdSettings: HouseholdSettings;
	updateVetMedPreferences: (
		updates: Partial<VetMedPreferences>,
	) => Promise<void>;
	updateHouseholdSettings: (
		updates: Partial<HouseholdSettings>,
	) => Promise<void>;
	formatTime: (date: Date) => string;
	formatWeight: (weightInKg: number) => string;
	formatTemperature: (tempInCelsius: number) => string;
	getUserTimezone: () => string;
	isFirstTimeUser: boolean;
	markOnboardingComplete: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(
	null,
);

export function useUserPreferencesContext() {
	const context = useContext(UserPreferencesContext);
	if (!context) {
		throw new Error(
			"useUserPreferencesContext must be used within UserPreferencesProvider",
		);
	}
	return context;
}

interface UserPreferencesProviderProps {
	children: React.ReactNode;
}

export function UserPreferencesProvider({
	children,
}: UserPreferencesProviderProps) {
	const user = useUser();
	const preferences = useUserPreferences();
	const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

	useEffect(() => {
		if (user) {
			// Check if this is a first-time user (no preferences set yet)
			const hasPreferences =
				user.clientMetadata?.vetMedPreferences ||
				user.clientMetadata?.householdSettings;
			const hasCompletedOnboarding = user.clientMetadata?.onboardingComplete;

			setIsFirstTimeUser(!hasPreferences && !hasCompletedOnboarding);
		}
	}, [user]);

	const markOnboardingComplete = async () => {
		if (!user) return;

		try {
			await user.update({
				clientMetadata: {
					...user.clientMetadata,
					onboardingComplete: true,
					onboardingCompletedAt: new Date().toISOString(),
				},
			});
			setIsFirstTimeUser(false);
		} catch (error) {
			console.error("Error marking onboarding complete:", error);
		}
	};

	const contextValue: UserPreferencesContextType = {
		...preferences,
		isFirstTimeUser,
		markOnboardingComplete,
	};

	return (
		<UserPreferencesContext.Provider value={contextValue}>
			{children}
		</UserPreferencesContext.Provider>
	);
}

// Hook for accessing user's timezone in medication scheduling
export function useUserTimezone() {
	const { getUserTimezone } = useUserPreferencesContext();
	return getUserTimezone();
}

// Hook for formatting dates according to user preferences
export function useDateTimeFormatting() {
	const { formatTime, vetMedPreferences } = useUserPreferencesContext();

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			timeZone: vetMedPreferences.defaultTimezone,
		});
	};

	const formatDateTime = (date: Date) => {
		return `${formatDate(date)} ${formatTime(date)}`;
	};

	const formatTimeInTimezone = (date: Date, timezone?: string) => {
		const tz = timezone || vetMedPreferences.defaultTimezone;
		return vetMedPreferences.displayPreferences.use24HourTime
			? date.toLocaleTimeString("en-US", {
					hour12: false,
					hour: "2-digit",
					minute: "2-digit",
					timeZone: tz,
				})
			: date.toLocaleTimeString("en-US", {
					hour12: true,
					hour: "numeric",
					minute: "2-digit",
					timeZone: tz,
				});
	};

	return {
		formatTime,
		formatDate,
		formatDateTime,
		formatTimeInTimezone,
	};
}

// Hook for getting notification preferences
export function useNotificationPreferences() {
	const { vetMedPreferences } = useUserPreferencesContext();
	return vetMedPreferences.notificationPreferences;
}

// Hook for getting household information
export function useHouseholdInfo() {
	const { householdSettings } = useUserPreferencesContext();
	return {
		householdName: householdSettings.primaryHouseholdName,
		location: householdSettings.defaultLocation,
		veterinarian: householdSettings.preferredVeterinarian,
		roles: householdSettings.householdRoles,
		inventoryPreferences: householdSettings.inventoryPreferences,
	};
}
