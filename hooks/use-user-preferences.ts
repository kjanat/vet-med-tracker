"use client";

import { useUser } from "@clerk/nextjs";
import { useMemo } from "react";

export interface VetMedPreferences {
	defaultTimezone: string;
	preferredPhoneNumber: string;
	emergencyContactName: string;
	emergencyContactPhone: string;
	notificationPreferences: {
		emailReminders: boolean;
		smsReminders: boolean;
		pushNotifications: boolean;
		reminderLeadTime: number; // minutes before due time
	};
	displayPreferences: {
		use24HourTime: boolean;
		temperatureUnit: "celsius" | "fahrenheit";
		weightUnit: "kg" | "lbs";
	};
}

export interface HouseholdSettings {
	primaryHouseholdName: string;
	defaultLocation: {
		address: string;
		city: string;
		state: string;
		zipCode: string;
		timezone: string;
	};
	householdRoles: string[];
	preferredVeterinarian: {
		name: string;
		phone: string;
		address: string;
	};
	inventoryPreferences: {
		lowStockThreshold: number;
		autoReorderEnabled: boolean;
		expirationWarningDays: number;
	};
}

const defaultVetMedPreferences: VetMedPreferences = {
	defaultTimezone: "America/New_York",
	preferredPhoneNumber: "",
	emergencyContactName: "",
	emergencyContactPhone: "",
	notificationPreferences: {
		emailReminders: true,
		smsReminders: false,
		pushNotifications: true,
		reminderLeadTime: 15,
	},
	displayPreferences: {
		use24HourTime: false,
		temperatureUnit: "fahrenheit",
		weightUnit: "lbs",
	},
};

const defaultHouseholdSettings: HouseholdSettings = {
	primaryHouseholdName: "",
	defaultLocation: {
		address: "",
		city: "",
		state: "",
		zipCode: "",
		timezone: "America/New_York",
	},
	householdRoles: ["Owner", "Primary Caregiver"],
	preferredVeterinarian: {
		name: "",
		phone: "",
		address: "",
	},
	inventoryPreferences: {
		lowStockThreshold: 7,
		autoReorderEnabled: false,
		expirationWarningDays: 30,
	},
};

export function useUserPreferences() {
	const { user, isLoaded } = useUser();

	const vetMedPreferences = useMemo(() => {
		if (!isLoaded || !user) return defaultVetMedPreferences;

		const saved = user.unsafeMetadata.vetMedPreferences as VetMedPreferences;
		return saved
			? { ...defaultVetMedPreferences, ...saved }
			: defaultVetMedPreferences;
	}, [user, isLoaded]);

	const householdSettings = useMemo(() => {
		if (!isLoaded || !user) return defaultHouseholdSettings;

		const saved = user.unsafeMetadata.householdSettings as HouseholdSettings;
		return saved
			? { ...defaultHouseholdSettings, ...saved }
			: defaultHouseholdSettings;
	}, [user, isLoaded]);

	const updateVetMedPreferences = async (
		updates: Partial<VetMedPreferences>,
	) => {
		if (!user) throw new Error("User not loaded");

		const newPreferences = { ...vetMedPreferences, ...updates };

		await user.update({
			unsafeMetadata: {
				...user.unsafeMetadata,
				vetMedPreferences: newPreferences,
			},
		});

		// Optionally sync to backend
		try {
			await fetch("/api/user/metadata", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ vetMedPreferences: newPreferences }),
			});
		} catch (error) {
			console.warn("Failed to sync preferences to backend:", error);
		}
	};

	const updateHouseholdSettings = async (
		updates: Partial<HouseholdSettings>,
	) => {
		if (!user) throw new Error("User not loaded");

		const newSettings = { ...householdSettings, ...updates };

		await user.update({
			unsafeMetadata: {
				...user.unsafeMetadata,
				householdSettings: newSettings,
			},
		});

		// Optionally sync to backend
		try {
			await fetch("/api/user/metadata", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ householdSettings: newSettings }),
			});
		} catch (error) {
			console.warn("Failed to sync settings to backend:", error);
		}
	};

	// Utility functions
	const formatTime = (date: Date) => {
		return vetMedPreferences.displayPreferences.use24HourTime
			? date.toLocaleTimeString("en-US", {
					hour12: false,
					hour: "2-digit",
					minute: "2-digit",
				})
			: date.toLocaleTimeString("en-US", {
					hour12: true,
					hour: "numeric",
					minute: "2-digit",
				});
	};

	const formatWeight = (weightInKg: number) => {
		if (vetMedPreferences.displayPreferences.weightUnit === "lbs") {
			return `${(weightInKg * 2.20462).toFixed(1)} lbs`;
		}
		return `${weightInKg.toFixed(1)} kg`;
	};

	const formatTemperature = (tempInCelsius: number) => {
		if (vetMedPreferences.displayPreferences.temperatureUnit === "fahrenheit") {
			return `${((tempInCelsius * 9) / 5 + 32).toFixed(1)}°F`;
		}
		return `${tempInCelsius.toFixed(1)}°C`;
	};

	const getUserTimezone = () => {
		return (
			vetMedPreferences.defaultTimezone ||
			householdSettings.defaultLocation.timezone ||
			"America/New_York"
		);
	};

	return {
		isLoaded,
		vetMedPreferences,
		householdSettings,
		updateVetMedPreferences,
		updateHouseholdSettings,
		// Utility functions
		formatTime,
		formatWeight,
		formatTemperature,
		getUserTimezone,
	};
}
