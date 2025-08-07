/**
 * Comprehensive type definitions for the consolidated AppProvider state management
 */

import type { vetmedUsers } from "@/db/schema";

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

type User = typeof vetmedUsers.$inferSelect;

export interface Animal {
	id: string;
	name: string;
	species: string;
	avatar?: string;
	pendingMeds: number;
}

export interface Household {
	id: string;
	name: string;
	avatar?: string;
}

export interface UserProfile {
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

// =============================================================================
// PREFERENCES TYPES
// =============================================================================

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

// =============================================================================
// ACCESSIBILITY TYPES
// =============================================================================

export interface AccessibilityState {
	announcements: {
		polite: string;
		assertive: string;
	};
	reducedMotion: boolean;
	highContrast: boolean;
	fontSize: "small" | "medium" | "large";
}

export type AnnouncementPriority = "polite" | "assertive";

// =============================================================================
// STATE MANAGEMENT TYPES
// =============================================================================

export interface LoadingStates {
	user: boolean;
	households: boolean;
	animals: boolean;
	pendingMeds: boolean;
}

export interface ErrorStates {
	user: string | null;
	households: string | null;
	animals: string | null;
	pendingMeds: string | null;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// =============================================================================
// MAIN APP STATE TYPE
// =============================================================================

export interface AppState {
	// Household & Animal Management
	selectedHouseholdId: string | null;
	selectedAnimalId: string | null;
	households: Household[];
	animals: Animal[];

	// Authentication State
	user: User;
	userProfile: UserProfile | null;
	isAuthenticated: boolean;
	authStatus: AuthStatus;

	// User Preferences
	preferences: VetMedPreferences;
	householdSettings: HouseholdSettings;
	isFirstTimeUser: boolean;

	// Accessibility State
	accessibility: AccessibilityState;

	// Offline & Sync State
	isOffline: boolean;
	pendingSyncCount: number;

	// Loading & Error States
	loading: LoadingStates;
	errors: ErrorStates;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

export type AppAction =
	| { type: "SET_HOUSEHOLD"; payload: Household | null }
	| { type: "SET_ANIMAL"; payload: Animal | null }
	| { type: "SET_HOUSEHOLDS"; payload: Household[] }
	| { type: "SET_ANIMALS"; payload: Animal[] }
	| { type: "SET_USER"; payload: User }
	| { type: "SET_USER_PROFILE"; payload: UserProfile | null }
	| { type: "SET_AUTH_STATUS"; payload: AuthStatus }
	| { type: "SET_PREFERENCES"; payload: Partial<VetMedPreferences> }
	| { type: "SET_HOUSEHOLD_SETTINGS"; payload: Partial<HouseholdSettings> }
	| { type: "SET_FIRST_TIME_USER"; payload: boolean }
	| { type: "SET_ACCESSIBILITY"; payload: Partial<AccessibilityState> }
	| { type: "SET_OFFLINE_STATUS"; payload: boolean }
	| { type: "SET_PENDING_SYNC_COUNT"; payload: number }
	| {
			type: "SET_LOADING";
			payload: { key: keyof LoadingStates; value: boolean };
	  }
	| {
			type: "SET_ERROR";
			payload: { key: keyof ErrorStates; value: string | null };
	  }
	| {
			type: "ANNOUNCE";
			payload: { message: string; priority: AnnouncementPriority };
	  };

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface AppContextType extends AppState {
	// Actions
	setSelectedHousehold: (household: Household | null) => void;
	setSelectedAnimal: (animal: Animal | null) => void;
	refreshPendingMeds: () => void;

	// Auth Actions
	login: () => void;
	logout: () => Promise<void>;
	refreshAuth: () => Promise<void>;

	// Preferences Actions
	updateVetMedPreferences: (
		updates: Partial<VetMedPreferences>,
	) => Promise<void>;
	updateHouseholdSettings: (
		updates: Partial<HouseholdSettings>,
	) => Promise<void>;
	markOnboardingComplete: () => Promise<void>;

	// Accessibility Actions
	announce: (message: string, priority?: AnnouncementPriority) => void;

	// Utility Functions
	formatTime: (date: Date) => string;
	formatWeight: (weightInKg: number) => string;
	formatTemperature: (tempInCelsius: number) => string;
	getUserTimezone: () => string;

	// Computed Values
	selectedHousehold: Household | null;
	selectedAnimal: Animal | null;
}

// =============================================================================
// LEGACY COMPATIBILITY TYPES
// =============================================================================

export interface LegacyAppContextType {
	user: User;
	selectedHousehold: Household | null;
	setSelectedHousehold: (household: Household | null) => void;
	selectedAnimal: Animal | null;
	setSelectedAnimal: (animal: Animal | null) => void;
	animals: Animal[];
	households: Household[];
	isOffline: boolean;
	pendingSyncCount: number;
	refreshPendingMeds: () => void;
}

export interface LegacyAuthContextType {
	user: UserProfile | null | undefined;
	households: Array<{ id: string; name: string }>;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
	login: () => void;
	logout: () => Promise<void>;
	refreshAuth: () => Promise<void>;
}

export interface LegacyUserPreferencesContextType {
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

// =============================================================================
// UTILITY TYPES
// =============================================================================

export interface DateTimeFormatters {
	formatTime: (date: Date) => string;
	formatDate: (date: Date) => string;
	formatDateTime: (date: Date) => string;
	formatTimeInTimezone: (date: Date, timezone?: string) => string;
}

export interface HouseholdInfo {
	householdName: string;
	location: {
		address: string;
		city: string;
		state: string;
		zipCode: string;
		timezone: string;
	};
	veterinarian: {
		name: string;
		phone: string;
		address: string;
	};
	roles: string[];
	inventoryPreferences: {
		lowStockThreshold: number;
		autoReorderEnabled: boolean;
		expirationWarningDays: number;
	};
}

export interface NotificationPreferences {
	emailReminders: boolean;
	smsReminders: boolean;
	pushNotifications: boolean;
	reminderLeadTime: number;
}

// =============================================================================
// PROVIDER COMPONENT PROPS
// =============================================================================

export interface ConsolidatedAppProviderProps {
	children: React.ReactNode;
}

// =============================================================================
// HOOK RETURN TYPES
// =============================================================================

export interface ScreenReaderAnnouncementsHook {
	announce: (message: string, priority?: AnnouncementPriority) => void;
}

export interface AuthRequirementHook {
	isAuthenticated: boolean;
	isLoading: boolean;
}

// =============================================================================
// PERFORMANCE OPTIMIZATION TYPES
// =============================================================================

export interface MemoizedSelectors {
	selectedHousehold: Household | null;
	selectedAnimal: Animal | null;
	householdAnimals: Animal[];
	pendingMedicationCount: number;
}

export interface OptimizedUpdaters {
	updateHousehold: (householdId: string) => void;
	updateAnimal: (animalId: string) => void;
	batchUpdatePreferences: (
		updates: Partial<VetMedPreferences>,
	) => Promise<void>;
}
