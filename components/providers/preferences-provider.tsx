"use client";

import { useUser } from "@stackframe/stack";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type {
  HouseholdSettings,
  VetMedPreferences,
} from "./app-provider-consolidated";
import { useStackMetadataPreferences } from "./use-stack-metadata-preferences";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface PreferencesState {
  preferences: VetMedPreferences;
  householdSettings: HouseholdSettings;
  isFirstTimeUser: boolean;
}

type PreferencesAction =
  | { type: "SET_PREFERENCES"; payload: Partial<VetMedPreferences> }
  | { type: "SET_HOUSEHOLD_SETTINGS"; payload: Partial<HouseholdSettings> }
  | { type: "SET_FIRST_TIME_USER"; payload: boolean };

// =============================================================================
// DEFAULT VALUES
// =============================================================================

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

// =============================================================================
// REDUCER
// =============================================================================

const initialState: PreferencesState = {
  householdSettings: defaultHouseholdSettings,
  isFirstTimeUser: false,
  preferences: defaultVetMedPreferences,
};

function preferencesReducer(
  state: PreferencesState,
  action: PreferencesAction,
): PreferencesState {
  switch (action.type) {
    case "SET_PREFERENCES":
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };

    case "SET_HOUSEHOLD_SETTINGS":
      return {
        ...state,
        householdSettings: { ...state.householdSettings, ...action.payload },
      };

    case "SET_FIRST_TIME_USER":
      return { ...state, isFirstTimeUser: action.payload };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT & PROVIDER
// =============================================================================

export interface PreferencesContextType extends PreferencesState {
  updateVetMedPreferences: (
    updates: Partial<VetMedPreferences>,
  ) => Promise<void>;
  updateHouseholdSettings: (
    updates: Partial<HouseholdSettings>,
  ) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  formatTime: (date: Date) => string;
  formatWeight: (weightInKg: number) => string;
  formatTemperature: (tempInCelsius: number) => string;
  getUserTimezone: () => string;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(preferencesReducer, initialState);
  const stackUser = useUser(); // Get the actual Stack user instance

  // =============================================================================
  // PREFERENCES LOADING
  // =============================================================================

  const handlePreferencesUpdate = useCallback(
    (preferences: VetMedPreferences) => {
      dispatch({ payload: preferences, type: "SET_PREFERENCES" });
    },
    [],
  );

  const handleHouseholdSettingsUpdate = useCallback(
    (settings: HouseholdSettings) => {
      dispatch({ payload: settings, type: "SET_HOUSEHOLD_SETTINGS" });
    },
    [],
  );

  const handleFirstTimeUserUpdate = useCallback((isFirst: boolean) => {
    dispatch({ payload: isFirst, type: "SET_FIRST_TIME_USER" });
  }, []);

  useStackMetadataPreferences({
    defaultHouseholdSettings,
    defaultPreferences: defaultVetMedPreferences,
    onFirstTimeUserChange: handleFirstTimeUserUpdate,
    onHouseholdSettings: handleHouseholdSettingsUpdate,
    onPreferences: handlePreferencesUpdate,
    stackUser,
  });

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const updateVetMedPreferences = useCallback(
    async (updates: Partial<VetMedPreferences>) => {
      if (!stackUser) throw new Error("User not loaded");

      const newPreferences = { ...state.preferences, ...updates };

      await stackUser.update({
        clientMetadata: {
          ...stackUser.clientMetadata,
          vetMedPreferences: newPreferences,
        },
      });

      dispatch({ payload: updates, type: "SET_PREFERENCES" });

      // Sync to backend
      try {
        await fetch("/api/user/metadata", {
          body: JSON.stringify({ vetMedPreferences: newPreferences }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
      } catch (error) {
        console.warn("Failed to sync preferences to backend:", error);
      }
    },
    [stackUser, state.preferences],
  );

  const updateHouseholdSettings = useCallback(
    async (updates: Partial<HouseholdSettings>) => {
      if (!stackUser) throw new Error("User not loaded");

      const newSettings = { ...state.householdSettings, ...updates };

      await stackUser.update({
        clientMetadata: {
          ...stackUser.clientMetadata,
          householdSettings: newSettings,
        },
      });

      dispatch({ payload: updates, type: "SET_HOUSEHOLD_SETTINGS" });

      // Sync to backend
      try {
        await fetch("/api/user/metadata", {
          body: JSON.stringify({ householdSettings: newSettings }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
      } catch (error) {
        console.warn("Failed to sync settings to backend:", error);
      }
    },
    [stackUser, state.householdSettings],
  );

  const markOnboardingComplete = useCallback(async () => {
    if (!stackUser) return;

    try {
      await stackUser.update({
        clientMetadata: {
          ...stackUser.clientMetadata,
          onboardingComplete: true,
          onboardingCompletedAt: new Date().toISOString(),
        },
      });
      dispatch({ payload: false, type: "SET_FIRST_TIME_USER" });
    } catch (error) {
      console.error("Error marking onboarding complete:", error);
    }
  }, [stackUser]);

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const formatTime = useCallback(
    (date: Date) =>
      state.preferences.displayPreferences.use24HourTime
        ? date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            hour12: false,
            minute: "2-digit",
          })
        : date.toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
            minute: "2-digit",
          }),
    [state.preferences.displayPreferences.use24HourTime],
  );

  const formatWeight = useCallback(
    (weightInKg: number) => {
      if (state.preferences.displayPreferences.weightUnit === "lbs") {
        return `${(weightInKg * 2.20462).toFixed(1)} lbs`;
      }
      return `${weightInKg.toFixed(1)} kg`;
    },
    [state.preferences.displayPreferences.weightUnit],
  );

  const formatTemperature = useCallback(
    (tempInCelsius: number) => {
      if (
        state.preferences.displayPreferences.temperatureUnit === "fahrenheit"
      ) {
        return `${((tempInCelsius * 9) / 5 + 32).toFixed(1)}°F`;
      }
      return `${tempInCelsius.toFixed(1)}°C`;
    },
    [state.preferences.displayPreferences.temperatureUnit],
  );

  const getUserTimezone = useCallback(
    () =>
      state.preferences.defaultTimezone ||
      state.householdSettings.defaultLocation.timezone ||
      "America/New_York",
    [
      state.preferences.defaultTimezone,
      state.householdSettings.defaultLocation.timezone,
    ],
  );

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: PreferencesContextType = useMemo(
    () => ({
      ...state,
      formatTemperature,
      formatTime,
      formatWeight,
      getUserTimezone,
      markOnboardingComplete,
      updateHouseholdSettings,
      updateVetMedPreferences,
    }),
    [
      state,
      updateVetMedPreferences,
      updateHouseholdSettings,
      markOnboardingComplete,
      formatTime,
      formatWeight,
      formatTemperature,
      getUserTimezone,
    ],
  );

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}
