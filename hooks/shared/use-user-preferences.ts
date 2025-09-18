"use client";

import { useUser } from "@stackframe/stack";
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
    weekStartsOn?: 0 | 1; // 0 = Sunday, 1 = Monday
    theme?: "system" | "light" | "dark";
  };
  defaultHouseholdId?: string;
  defaultAnimalId?: string;
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
  defaultAnimalId: undefined,
  defaultHouseholdId: undefined,
  defaultTimezone: "America/New_York",
  displayPreferences: {
    temperatureUnit: "fahrenheit",
    theme: "system",
    use24HourTime: false,
    weekStartsOn: 0,
    weightUnit: "lbs",
  },
  emergencyContactName: "",
  emergencyContactPhone: "",
  notificationPreferences: {
    emailReminders: true,
    pushNotifications: true,
    reminderLeadTime: 15,
    smsReminders: false,
  },
  preferredPhoneNumber: "",
};

const defaultHouseholdSettings: HouseholdSettings = {
  defaultLocation: {
    address: "",
    city: "",
    state: "",
    timezone: "America/New_York",
    zipCode: "",
  },
  householdRoles: ["Owner", "Primary Caregiver"],
  inventoryPreferences: {
    autoReorderEnabled: false,
    expirationWarningDays: 30,
    lowStockThreshold: 7,
  },
  preferredVeterinarian: {
    address: "",
    name: "",
    phone: "",
  },
  primaryHouseholdName: "",
};

export function useUserPreferences() {
  const user = useUser();

  const isLoaded = true; // Stack Auth loads synchronously

  const vetMedPreferences = useMemo(() => {
    if (!isLoaded || !user) return defaultVetMedPreferences;

    const saved = user.clientMetadata?.vetMedPreferences as VetMedPreferences;
    return saved
      ? { ...defaultVetMedPreferences, ...saved }
      : defaultVetMedPreferences;
  }, [user]);

  const householdSettings = useMemo(() => {
    if (!isLoaded || !user) return defaultHouseholdSettings;

    const saved = user.clientMetadata?.householdSettings as HouseholdSettings;
    return saved
      ? { ...defaultHouseholdSettings, ...saved }
      : defaultHouseholdSettings;
  }, [user]);

  const updateVetMedPreferences = async (
    updates: Partial<VetMedPreferences>,
  ) => {
    if (!user) throw new Error("User not loaded");

    const newPreferences = { ...vetMedPreferences, ...updates };

    await user.update({
      clientMetadata: {
        ...user.clientMetadata,
        vetMedPreferences: newPreferences,
      },
    });

    // Optionally sync to backend
    try {
      await fetch("/api/user/metadata", {
        body: JSON.stringify({ vetMedPreferences: newPreferences }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
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
      clientMetadata: {
        ...user.clientMetadata,
        householdSettings: newSettings,
      },
    });

    // Optionally sync to backend
    try {
      await fetch("/api/user/metadata", {
        body: JSON.stringify({ householdSettings: newSettings }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
    } catch (error) {
      console.warn("Failed to sync settings to backend:", error);
    }
  };

  // Utility functions
  const formatTime = (date: Date) =>
    vetMedPreferences.displayPreferences.use24HourTime
      ? date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          hour12: false,
          minute: "2-digit",
        })
      : date.toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
          minute: "2-digit",
        });

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

  const getUserTimezone = () =>
    vetMedPreferences.defaultTimezone ||
    householdSettings.defaultLocation.timezone ||
    "America/New_York";

  return {
    formatTemperature,
    // Utility functions
    formatTime,
    formatWeight,
    getUserTimezone,
    householdSettings,
    isLoaded,
    updateHouseholdSettings,
    updateVetMedPreferences,
    vetMedPreferences,
  };
}
