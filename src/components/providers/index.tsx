// =============================================================================
// PROVIDER EXPORTS - CONSOLIDATED ARCHITECTURE
// =============================================================================

// Main consolidated provider (recommended)
// Hooks from consolidated provider
export {
  ConsolidatedAppProvider,
  useApp,
  useAppLegacy,
  useAuth,
  useDateTimeFormatting,
  useHouseholdInfo,
  useNotificationPreferences,
  useRequireAuth,
  useScreenReaderAnnouncements,
  useUserPreferencesContext,
  useUserTimezone,
} from "./app-provider-consolidated.tsx";

// All functionality is now consolidated in the main provider

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// All types are consolidated
export type {
  AppContextType,
  HouseholdSettings,
  User,
  UserProfile,
  VetMedPreferences,
} from "./app-provider-consolidated.tsx";
