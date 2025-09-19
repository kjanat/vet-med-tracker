"use client";

import { type ReactNode, Suspense } from "react";
import { AccessibilityProvider } from "./accessibility-provider";
import { AuthProvider } from "./auth-provider";
import { HouseholdProvider } from "./household-provider";
import { PreferencesProvider } from "./preferences-provider";

// =============================================================================
// COMPOSABLE PROVIDER ARCHITECTURE
// =============================================================================

/**
 * New modular provider architecture that separates concerns while
 * maintaining full backwards compatibility with existing components.
 *
 * Provider hierarchy:
 * 1. AuthProvider - User authentication and profile management
 * 2. PreferencesProvider - User preferences and settings
 * 3. HouseholdProvider - Household and animal selection
 * 4. AccessibilityProvider - Screen reader and accessibility features
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthProvider>
        <PreferencesProvider>
          <HouseholdProvider>
            <AccessibilityProvider>{children}</AccessibilityProvider>
          </HouseholdProvider>
        </PreferencesProvider>
      </AuthProvider>
    </Suspense>
  );
}

// =============================================================================
// BACKWARDS COMPATIBILITY LAYER
// =============================================================================

/**
 * Legacy compatibility hooks that maintain the exact same API as the
 * consolidated provider while now being powered by the focused providers.
 */

import { useCallback, useMemo } from "react";
import { useAccessibility } from "./accessibility-provider";
import type { AppContextType } from "./app-provider-consolidated";
import { useAuth } from "./auth-provider";
import { useHousehold } from "./household-provider";
import { usePreferences } from "./preferences-provider";

// Main hook that combines all provider contexts
export function useApp(): AppContextType {
  const auth = useAuth();
  const household = useHousehold();
  const preferences = usePreferences();
  const accessibility = useAccessibility();

  // Simulate the offline functionality (simplified since offline features were removed)
  const offlineState = useMemo(
    () => ({
      isOffline: !navigator.onLine,
      pendingSyncCount: 0,
    }),
    [],
  );

  // =============================================================================
  // COMBINED CONTEXT VALUE
  // =============================================================================

  return useMemo(
    () => ({
      // Accessibility state
      accessibility: {
        announcements: accessibility.announcements,
        fontSize: accessibility.fontSize,
        highContrast: accessibility.highContrast,
        reducedMotion: accessibility.reducedMotion,
      },
      animals: household.animals,
      announce: accessibility.announce,
      authStatus: auth.authStatus,

      // Error states (combined)
      errors: {
        animals: household.errors.animals,
        households: household.errors.households,
        pendingMeds: household.errors.pendingMeds,
        user: auth.error,
      },
      formatTemperature: preferences.formatTemperature,

      // Utility functions
      formatTime: preferences.formatTime,
      formatWeight: preferences.formatWeight,
      getUserTimezone: preferences.getUserTimezone,
      householdSettings: preferences.householdSettings,
      households: household.households,
      isAuthenticated: auth.isAuthenticated,
      isFirstTimeUser: preferences.isFirstTimeUser,

      // Offline state (simplified)
      isOffline: offlineState.isOffline,

      // Loading states (combined)
      loading: {
        animals: household.loading.animals,
        households: household.loading.households,
        pendingMeds: household.loading.pendingMeds,
        user: auth.loading,
      },
      login: auth.login,
      logout: auth.logout,
      markOnboardingComplete: preferences.markOnboardingComplete,
      pendingSyncCount: offlineState.pendingSyncCount,

      // Preferences state
      preferences: preferences.preferences,
      refreshAuth: auth.refreshAuth,
      refreshPendingMeds: household.refreshPendingMeds,
      selectedAnimal: household.selectedAnimal,
      selectedAnimalId: household.selectedAnimalId,
      selectedHousehold: household.selectedHousehold,

      // Household & Animal state
      selectedHouseholdId: household.selectedHouseholdId,
      setSelectedAnimal: household.setSelectedAnimal,

      // Actions
      setSelectedHousehold: household.setSelectedHousehold,
      updateHouseholdSettings: preferences.updateHouseholdSettings,
      updateVetMedPreferences: preferences.updateVetMedPreferences,
      // Auth state
      user: auth.user,
      userProfile: auth.userProfile,
    }),
    [auth, household, preferences, accessibility, offlineState],
  );
}

// =============================================================================
// LEGACY COMPATIBILITY HOOKS
// =============================================================================

// Legacy hook for existing AppProvider consumers
export function useAppLegacy() {
  const context = useApp();
  return {
    animals: context.animals,
    households: context.households,
    isOffline: context.isOffline,
    pendingSyncCount: context.pendingSyncCount,
    refreshPendingMeds: context.refreshPendingMeds,
    selectedAnimal: context.selectedAnimal,
    selectedHousehold: context.selectedHousehold,
    setSelectedAnimal: context.setSelectedAnimal,
    setSelectedHousehold: context.setSelectedHousehold,
    user: context.user,
  };
}

// Legacy hook for AuthProvider consumers
export { useAuth };

// Legacy hook for UserPreferencesProvider consumers
export function useUserPreferencesContext() {
  const preferences = usePreferences();
  const auth = useAuth();

  return {
    formatTemperature: preferences.formatTemperature,
    formatTime: preferences.formatTime,
    formatWeight: preferences.formatWeight,
    getUserTimezone: preferences.getUserTimezone,
    householdSettings: preferences.householdSettings,
    isFirstTimeUser: preferences.isFirstTimeUser,
    isLoaded: !auth.loading,
    markOnboardingComplete: preferences.markOnboardingComplete,
    updateHouseholdSettings: preferences.updateHouseholdSettings,
    updateVetMedPreferences: preferences.updateVetMedPreferences,
    vetMedPreferences: preferences.preferences,
  };
}

// Legacy hook for GlobalScreenReaderProvider consumers
export function useScreenReaderAnnouncements() {
  const { announce } = useAccessibility();
  return { announce };
}

// =============================================================================
// SPECIALIZED HOOKS FOR SPECIFIC FEATURES
// =============================================================================

export function useUserTimezone() {
  const { getUserTimezone } = usePreferences();
  return getUserTimezone();
}

export function useDateTimeFormatting() {
  const { formatTime, preferences } = usePreferences();

  const formatDate = useCallback(
    (date: Date) =>
      date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        timeZone: preferences.defaultTimezone,
        year: "numeric",
      }),
    [preferences.defaultTimezone],
  );

  const formatDateTime = useCallback(
    (date: Date) => `${formatDate(date)} ${formatTime(date)}`,
    [formatDate, formatTime],
  );

  const formatTimeInTimezone = useCallback(
    (date: Date, timezone?: string) => {
      const tz = timezone || preferences.defaultTimezone;
      return preferences.displayPreferences.use24HourTime
        ? date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            hour12: false,
            minute: "2-digit",
            timeZone: tz,
          })
        : date.toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
            minute: "2-digit",
            timeZone: tz,
          });
    },
    [preferences.defaultTimezone, preferences.displayPreferences.use24HourTime],
  );

  return {
    formatDate,
    formatDateTime,
    formatTime,
    formatTimeInTimezone,
  };
}

export function useNotificationPreferences() {
  const { preferences } = usePreferences();
  return preferences.notificationPreferences;
}

export function useHouseholdInfo() {
  const { householdSettings } = usePreferences();
  return {
    householdName: householdSettings.primaryHouseholdName,
    inventoryPreferences: householdSettings.inventoryPreferences,
    location: householdSettings.defaultLocation,
    roles: householdSettings.householdRoles,
    veterinarian: householdSettings.preferredVeterinarian,
  };
}

export function useRequireAuth() {
  const { isAuthenticated, loading } = useAuth();
  return { isAuthenticated, isLoading: loading };
}
