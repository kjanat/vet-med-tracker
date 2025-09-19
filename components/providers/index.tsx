// =============================================================================
// PROVIDER EXPORTS
// =============================================================================

export {
  AccessibilityProvider,
  useAccessibility,
} from "./accessibility-provider";
// Original consolidated provider (for gradual migration)
export { ConsolidatedAppProvider } from "./app-provider-consolidated";
// New modular architecture
// Main app hook (backwards compatible)
// Legacy compatibility hooks
export {
  AppProviders,
  useApp,
  useAppLegacy,
  useDateTimeFormatting,
  useHouseholdInfo,
  useNotificationPreferences,
  useRequireAuth,
  useScreenReaderAnnouncements,
  useUserPreferencesContext,
  useUserTimezone,
} from "./app-providers";
export { AuthProvider, useAuth } from "./auth-provider";
// Other providers
export { BulkSelectionProvider } from "./bulk-selection-provider";
export { HouseholdProvider, useHousehold } from "./household-provider";
export { PreferencesProvider, usePreferences } from "./preferences-provider";

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { AccessibilityContextType } from "./accessibility-provider";
// Legacy types
export type {
  AppContextType,
  HouseholdSettings,
  User,
  UserProfile,
  VetMedPreferences,
} from "./app-provider-consolidated";
export type { AuthContextType } from "./auth-provider";
export type {
  Animal,
  Household,
  HouseholdContextType,
} from "./household-provider";
export type { PreferencesContextType } from "./preferences-provider";
