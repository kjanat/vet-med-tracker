"use client";

import { useUser } from "@stackframe/stack";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
} from "react";
import type { vetmedAnimals, vetmedHouseholds, vetmedUsers } from "@/db/schema";
import { getQueueSize } from "@/lib/offline/db";
import { trpc } from "@/server/trpc/client";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

type User = typeof vetmedUsers.$inferSelect;

// Stack user interface for conversion
interface StackUserForConversion {
	id: string;
	displayName?: string | null;
	profileImageUrl?: string | null;
	primaryEmail?: string | null;
}

// tRPC query result types
type HouseholdListItem = typeof vetmedHouseholds.$inferSelect & {
	role: string;
	joinedAt: string;
};

type AnimalFromDatabase = typeof vetmedAnimals.$inferSelect;

interface Animal {
	id: string;
	name: string;
	species: string;
	avatar?: string;
	pendingMeds: number;
}

interface Household {
	id: string;
	name: string;
	avatar?: string;
}

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

interface AccessibilityState {
	announcements: {
		polite: string;
		assertive: string;
	};
	reducedMotion: boolean;
	highContrast: boolean;
	fontSize: "small" | "medium" | "large";
}

interface LoadingStates {
	user: boolean;
	households: boolean;
	animals: boolean;
	pendingMeds: boolean;
}

interface ErrorStates {
	user: string | null;
	households: string | null;
	animals: string | null;
	pendingMeds: string | null;
}

// Consolidated State Shape
interface AppState {
	// Household & Animal Management
	selectedHouseholdId: string | null;
	selectedAnimalId: string | null;
	households: Household[];
	animals: Animal[];

	// Authentication State
	user: User | null;
	userProfile: UserProfile | null;
	isAuthenticated: boolean;
	authStatus: "loading" | "authenticated" | "unauthenticated";

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

type AppAction =
	| { type: "SET_HOUSEHOLD"; payload: Household | null }
	| { type: "SET_ANIMAL"; payload: Animal | null }
	| { type: "SET_HOUSEHOLDS"; payload: Household[] }
	| { type: "SET_ANIMALS"; payload: Animal[] }
	| { type: "SET_USER"; payload: User | null }
	| { type: "SET_USER_PROFILE"; payload: UserProfile | null }
	| {
			type: "SET_AUTH_STATUS";
			payload: "loading" | "authenticated" | "unauthenticated";
	  }
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
			payload: { message: string; priority: "polite" | "assertive" };
	  };

// =============================================================================
// DEFAULT VALUES
// =============================================================================

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
		weekStartsOn: 0,
		theme: "system",
	},
	defaultHouseholdId: undefined,
	defaultAnimalId: undefined,
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

const defaultAccessibilityState: AccessibilityState = {
	announcements: {
		polite: "",
		assertive: "",
	},
	reducedMotion: false,
	highContrast: false,
	fontSize: "medium",
};

const initialState: AppState = {
	selectedHouseholdId: null,
	selectedAnimalId: null,
	households: [],
	animals: [],
	user: null,
	userProfile: null,
	isAuthenticated: false,
	authStatus: "loading",
	preferences: defaultVetMedPreferences,
	householdSettings: defaultHouseholdSettings,
	isFirstTimeUser: false,
	accessibility: defaultAccessibilityState,
	isOffline: false,
	pendingSyncCount: 0,
	loading: {
		user: true,
		households: false,
		animals: false,
		pendingMeds: false,
	},
	errors: {
		user: null,
		households: null,
		animals: null,
		pendingMeds: null,
	},
};

// =============================================================================
// REDUCER
// =============================================================================

// Helper function to handle localStorage operations for household selection
function updateHouseholdLocalStorage(household: Household | null): void {
	if (typeof window === "undefined") return;

	if (household?.id) {
		localStorage.setItem("selectedHouseholdId", household.id);
	} else {
		localStorage.removeItem("selectedHouseholdId");
	}
}

// Helper function to handle localStorage operations for animal selection
function updateAnimalLocalStorage(animal: Animal | null): void {
	if (typeof window === "undefined") return;

	if (animal?.id) {
		localStorage.setItem("selectedAnimalId", animal.id);
	} else {
		localStorage.removeItem("selectedAnimalId");
	}
}

// Helper function to handle household change with animal clearing
function handleHouseholdChange(
	state: AppState,
	household: Household | null,
): AppState {
	const householdId = household?.id || null;

	// If household changed, clear selected animal
	if (householdId !== state.selectedHouseholdId) {
		updateHouseholdLocalStorage(household);
		if (typeof window !== "undefined") {
			localStorage.removeItem("selectedAnimalId");
		}
		return {
			...state,
			selectedHouseholdId: householdId,
			selectedAnimalId: null,
		};
	}

	return {
		...state,
		selectedHouseholdId: householdId,
	};
}

// Helper function to handle animal selection
function handleAnimalChange(state: AppState, animal: Animal | null): AppState {
	updateAnimalLocalStorage(animal);
	return {
		...state,
		selectedAnimalId: animal?.id || null,
	};
}

function appReducer(state: AppState, action: AppAction): AppState {
	switch (action.type) {
		case "SET_HOUSEHOLD":
			return handleHouseholdChange(state, action.payload);

		case "SET_ANIMAL":
			return handleAnimalChange(state, action.payload);

		case "SET_HOUSEHOLDS":
			return { ...state, households: action.payload };

		case "SET_ANIMALS":
			return { ...state, animals: action.payload };

		case "SET_USER":
			return {
				...state,
				user: action.payload,
				isAuthenticated: !!action.payload,
				authStatus: action.payload ? "authenticated" : "unauthenticated",
			};

		case "SET_USER_PROFILE":
			return { ...state, userProfile: action.payload };

		case "SET_AUTH_STATUS":
			return {
				...state,
				authStatus: action.payload,
				isAuthenticated: action.payload === "authenticated",
			};

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

		case "SET_ACCESSIBILITY":
			return {
				...state,
				accessibility: { ...state.accessibility, ...action.payload },
			};

		case "SET_OFFLINE_STATUS":
			return { ...state, isOffline: action.payload };

		case "SET_PENDING_SYNC_COUNT":
			return { ...state, pendingSyncCount: action.payload };

		case "SET_LOADING":
			return {
				...state,
				loading: {
					...state.loading,
					[action.payload.key]: action.payload.value,
				},
			};

		case "SET_ERROR":
			return {
				...state,
				errors: { ...state.errors, [action.payload.key]: action.payload.value },
			};

		case "ANNOUNCE": {
			const { message, priority } = action.payload;
			return {
				...state,
				accessibility: {
					...state.accessibility,
					announcements: {
						...state.accessibility.announcements,
						[priority]: message,
					},
				},
			};
		}

		default:
			return state;
	}
}

// =============================================================================
// CONTEXT & PROVIDER
// =============================================================================

interface AppContextType extends AppState {
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
	announce: (message: string, priority?: "polite" | "assertive") => void;

	// Utility Functions
	formatTime: (date: Date) => string;
	formatWeight: (weightInKg: number) => string;
	formatTemperature: (tempInCelsius: number) => string;
	getUserTimezone: () => string;

	// Computed Values
	selectedHousehold: Household | null;
	selectedAnimal: Animal | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useApp must be used within AppProvider");
	}
	return context;
}

// =============================================================================
// CONSOLIDATED PROVIDER
// =============================================================================

export function ConsolidatedAppProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(appReducer, initialState);
	const stackUser = useUser();
	const _isLoaded = true; // Stack Auth loads synchronously
	const utils = trpc.useUtils();

	// Refs for cleanup
	const timeoutRefs = useRef<Map<string, number>>(new Map());

	// =============================================================================
	// COMPUTED VALUES
	// =============================================================================

	const selectedHousehold = useMemo(
		() =>
			state.households.find((h) => h.id === state.selectedHouseholdId) || null,
		[state.households, state.selectedHouseholdId],
	);

	const selectedAnimal = useMemo(
		() => state.animals.find((a) => a.id === state.selectedAnimalId) || null,
		[state.animals, state.selectedAnimalId],
	);

	// =============================================================================
	// USER & AUTH MANAGEMENT
	// =============================================================================

	// Convert Stack user to internal user format
	const convertStackUser = useCallback(
		(stackUser: StackUserForConversion): User => ({
			id: stackUser.id,
			name: stackUser.displayName || stackUser.primaryEmail || "Unknown",
			firstName: null, // Let users set this themselves
			lastName: null, // Let users set this themselves
			email: stackUser.primaryEmail || "",
			image: stackUser.profileImageUrl || null,
			emailVerified: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			stackUserId: stackUser.id,
			// New flexible profile fields (all optional, defaults)
			bio: null,
			pronouns: null,
			location: null,
			website: null,
			socialLinks: {},
			profileData: {},
			profileVisibility: {
				name: true,
				email: false,
				bio: true,
				location: true,
			},
			profileCompletedAt: null,
			preferredTimezone: null,
			preferredPhoneNumber: null,
			use24HourTime: null,
			temperatureUnit: null,
			weightUnit: null,
			emailReminders: null,
			smsReminders: null,
			pushNotifications: null,
			reminderLeadTimeMinutes: null,
			emergencyContactName: null,
			emergencyContactPhone: null,
			onboardingComplete: null,
			onboardingCompletedAt: null,
			preferencesBackup: null,
			// Add missing fields to match schema
			weekStartsOn: null,
			defaultHouseholdId: null,
			defaultAnimalId: null,
			theme: null,
		}),
		[],
	);

	// Update user when Stack user changes
	useEffect(() => {
		const isLoaded = true; // Stack Auth loads synchronously
		if (isLoaded) {
			if (stackUser) {
				const user = convertStackUser(stackUser);
				dispatch({ type: "SET_USER", payload: user });
				dispatch({ type: "SET_AUTH_STATUS", payload: "authenticated" });
			} else {
				dispatch({ type: "SET_USER", payload: null });
				dispatch({ type: "SET_AUTH_STATUS", payload: "unauthenticated" });
			}
			dispatch({ type: "SET_LOADING", payload: { key: "user", value: false } });
		}
	}, [stackUser, convertStackUser]);

	// Get user profile data from tRPC
	const { data: userProfile, refetch: refetchProfile } =
		trpc.user.getProfile.useQuery(undefined, { enabled: !!stackUser });

	useEffect(() => {
		if (userProfile) {
			dispatch({ type: "SET_USER_PROFILE", payload: userProfile });
		}
	}, [userProfile]);

	// =============================================================================
	// PREFERENCES MANAGEMENT
	// =============================================================================

	// Load preferences from Stack user metadata
	useEffect(() => {
		if (stackUser?.clientMetadata) {
			const vetMedPrefs = stackUser.clientMetadata
				.vetMedPreferences as VetMedPreferences;
			const householdSettings = stackUser.clientMetadata
				.householdSettings as HouseholdSettings;

			if (vetMedPrefs) {
				dispatch({
					type: "SET_PREFERENCES",
					payload: { ...defaultVetMedPreferences, ...vetMedPrefs },
				});
			}

			if (householdSettings) {
				dispatch({
					type: "SET_HOUSEHOLD_SETTINGS",
					payload: { ...defaultHouseholdSettings, ...householdSettings },
				});
			}

			// Check if first time user
			const hasPreferences = vetMedPrefs || householdSettings;
			const hasCompletedOnboarding =
				stackUser.clientMetadata?.onboardingComplete;
			dispatch({
				type: "SET_FIRST_TIME_USER",
				payload: !hasPreferences && !hasCompletedOnboarding,
			});
		}
	}, [stackUser]);

	// =============================================================================
	// HOUSEHOLDS & ANIMALS MANAGEMENT
	// =============================================================================

	// Fetch household details from API
	const { data: householdData } = trpc.household.list.useQuery(undefined, {
		enabled: !!stackUser,
	});

	// Helper function to format household data
	const formatHouseholdData = useCallback(
		(data: HouseholdListItem[]): Household[] => {
			return data.map((h) => ({
				id: h.id,
				name: h.name,
				avatar: undefined, // TODO: Add avatar support
			}));
		},
		[],
	);

	// Helper function to restore household selection from localStorage
	const restoreHouseholdFromStorage = useCallback(
		(households: Household[]): Household | null => {
			if (typeof window === "undefined") return null;

			const savedHouseholdId = localStorage.getItem("selectedHouseholdId");
			return households.find((h) => h.id === savedHouseholdId) || null;
		},
		[],
	);

	// Helper function to select default household
	const selectDefaultHousehold = useCallback(
		(households: Household[]) => {
			const savedHousehold = restoreHouseholdFromStorage(households);

			if (savedHousehold) {
				dispatch({ type: "SET_HOUSEHOLD", payload: savedHousehold });
			} else if (households.length > 0) {
				// Fallback to first household
				dispatch({ type: "SET_HOUSEHOLD", payload: households[0] || null });
			}
		},
		[restoreHouseholdFromStorage],
	);

	// Update households when data is fetched
	useEffect(() => {
		if (!householdData || householdData.length === 0) return;

		const formattedHouseholds = formatHouseholdData(householdData);
		dispatch({ type: "SET_HOUSEHOLDS", payload: formattedHouseholds });

		// Auto-select household if none selected
		if (!state.selectedHouseholdId) {
			selectDefaultHousehold(formattedHouseholds);
		}
	}, [
		householdData,
		state.selectedHouseholdId,
		formatHouseholdData,
		selectDefaultHousehold,
	]);

	// Fetch animals for selected household
	const { data: animalData } = trpc.household.getAnimals.useQuery(
		{ householdId: state.selectedHouseholdId || "" },
		{ enabled: !!state.selectedHouseholdId },
	);

	// Fetch pending medications count
	const { data: pendingMedsData } = trpc.household.getPendingMeds.useQuery(
		{ householdId: state.selectedHouseholdId || "" },
		{
			enabled: !!state.selectedHouseholdId,
			refetchInterval: 60000, // Refresh every minute
		},
	);

	// Helper function to format animal data with pending meds
	const formatAnimalData = useCallback(
		(
			data: AnimalFromDatabase[],
			pendingByAnimal: Record<string, number> = {},
		): Animal[] => {
			return data.map((animal) => ({
				id: animal.id,
				name: animal.name,
				species: animal.species,
				avatar: undefined, // TODO: Add avatar support
				pendingMeds: pendingByAnimal[animal.id] || 0,
			}));
		},
		[],
	);

	// Helper function to restore animal selection from localStorage
	const restoreAnimalFromStorage = useCallback(
		(animals: Animal[]): Animal | null => {
			if (typeof window === "undefined") return null;

			const savedAnimalId = localStorage.getItem("selectedAnimalId");
			return animals.find((a) => a.id === savedAnimalId) || null;
		},
		[],
	);

	// Helper function to validate and update selected animal
	const validateSelectedAnimal = useCallback(
		(animals: Animal[]) => {
			if (state.selectedAnimalId) {
				// Check if currently selected animal still exists
				const stillExists = animals.some(
					(a) => a.id === state.selectedAnimalId,
				);
				if (!stillExists) {
					dispatch({ type: "SET_ANIMAL", payload: null });
				}
			} else {
				// Try to restore from localStorage
				const savedAnimal = restoreAnimalFromStorage(animals);
				if (savedAnimal) {
					dispatch({ type: "SET_ANIMAL", payload: savedAnimal });
				}
			}
		},
		[state.selectedAnimalId, restoreAnimalFromStorage],
	);

	// Update animals when data changes
	useEffect(() => {
		if (!animalData) return;

		const pendingByAnimal = pendingMedsData?.byAnimal || {};
		const formattedAnimals = formatAnimalData(animalData, pendingByAnimal);

		dispatch({ type: "SET_ANIMALS", payload: formattedAnimals });
		validateSelectedAnimal(formattedAnimals);
	}, [animalData, pendingMedsData, formatAnimalData, validateSelectedAnimal]);

	// =============================================================================
	// OFFLINE & SYNC MANAGEMENT
	// =============================================================================

	// Monitor online/offline status
	useEffect(() => {
		const handleOnline = () =>
			dispatch({ type: "SET_OFFLINE_STATUS", payload: false });
		const handleOffline = () =>
			dispatch({ type: "SET_OFFLINE_STATUS", payload: true });

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		dispatch({ type: "SET_OFFLINE_STATUS", payload: !navigator.onLine });

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// Update pending sync count
	const updatePendingSyncCount = useCallback(async () => {
		try {
			const count = await getQueueSize(state.selectedHouseholdId || undefined);
			dispatch({ type: "SET_PENDING_SYNC_COUNT", payload: count });
		} catch (error) {
			console.warn("Failed to get pending sync count:", error);
			dispatch({ type: "SET_PENDING_SYNC_COUNT", payload: 0 });
		}
	}, [state.selectedHouseholdId]);

	useEffect(() => {
		updatePendingSyncCount();
		const interval = setInterval(updatePendingSyncCount, 5000);
		return () => clearInterval(interval);
	}, [updatePendingSyncCount]);

	// =============================================================================
	// ACCESSIBILITY MANAGEMENT
	// =============================================================================

	// Clear announcements after timeout
	useEffect(() => {
		const { polite, assertive } = state.accessibility.announcements;

		if (polite) {
			const timeoutId = window.setTimeout(() => {
				dispatch({
					type: "ANNOUNCE",
					payload: { message: "", priority: "polite" },
				});
			}, 1000);
			timeoutRefs.current.set("polite", timeoutId);
		}

		if (assertive) {
			const timeoutId = window.setTimeout(() => {
				dispatch({
					type: "ANNOUNCE",
					payload: { message: "", priority: "assertive" },
				});
			}, 1000);
			timeoutRefs.current.set("assertive", timeoutId);
		}

		return () => {
			timeoutRefs.current.forEach((id) => clearTimeout(id));
			timeoutRefs.current.clear();
		};
	}, [state.accessibility.announcements]);

	// =============================================================================
	// ACTION HANDLERS
	// =============================================================================

	const setSelectedHousehold = useCallback((household: Household | null) => {
		dispatch({ type: "SET_HOUSEHOLD", payload: household });
	}, []);

	const setSelectedAnimal = useCallback((animal: Animal | null) => {
		dispatch({ type: "SET_ANIMAL", payload: animal });
	}, []);

	const refreshPendingMeds = useCallback(() => {
		if (state.selectedHouseholdId) {
			utils.household.getPendingMeds.invalidate({
				householdId: state.selectedHouseholdId,
			});
		}
	}, [utils.household.getPendingMeds, state.selectedHouseholdId]);

	const login = useCallback(() => {
		// Stack Auth uses redirects for sign-in
		window.location.href = "/handler/sign-in";
	}, []);

	const logout = useCallback(async () => {
		// Stack Auth logout
		if (stackUser) {
			await stackUser.signOut();
		}
	}, [stackUser]);

	const refreshAuth = useCallback(async () => {
		await refetchProfile();
	}, [refetchProfile]);

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

			dispatch({ type: "SET_PREFERENCES", payload: updates });

			// Sync to backend
			try {
				await fetch("/api/user/metadata", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ vetMedPreferences: newPreferences }),
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

			dispatch({ type: "SET_HOUSEHOLD_SETTINGS", payload: updates });

			// Sync to backend
			try {
				await fetch("/api/user/metadata", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ householdSettings: newSettings }),
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
			dispatch({ type: "SET_FIRST_TIME_USER", payload: false });
		} catch (error) {
			console.error("Error marking onboarding complete:", error);
		}
	}, [stackUser]);

	const announce = useCallback(
		(message: string, priority: "polite" | "assertive" = "polite") => {
			dispatch({ type: "ANNOUNCE", payload: { message, priority } });
		},
		[],
	);

	// =============================================================================
	// UTILITY FUNCTIONS
	// =============================================================================

	const formatTime = useCallback(
		(date: Date) => {
			return state.preferences.displayPreferences.use24HourTime
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
		},
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

	const getUserTimezone = useCallback(() => {
		return (
			state.preferences.defaultTimezone ||
			state.householdSettings.defaultLocation.timezone ||
			"America/New_York"
		);
	}, [
		state.preferences.defaultTimezone,
		state.householdSettings.defaultLocation.timezone,
	]);

	// =============================================================================
	// CONTEXT VALUE
	// =============================================================================

	const contextValue: AppContextType = useMemo(
		() => ({
			// State
			...state,
			selectedHousehold,
			selectedAnimal,

			// Actions
			setSelectedHousehold,
			setSelectedAnimal,
			refreshPendingMeds,
			login,
			logout,
			refreshAuth,
			updateVetMedPreferences,
			updateHouseholdSettings,
			markOnboardingComplete,
			announce,

			// Utilities
			formatTime,
			formatWeight,
			formatTemperature,
			getUserTimezone,
		}),
		[
			state,
			selectedHousehold,
			selectedAnimal,
			setSelectedHousehold,
			setSelectedAnimal,
			refreshPendingMeds,
			login,
			logout,
			refreshAuth,
			updateVetMedPreferences,
			updateHouseholdSettings,
			markOnboardingComplete,
			announce,
			formatTime,
			formatWeight,
			formatTemperature,
			getUserTimezone,
		],
	);

	return (
		<AppContext.Provider value={contextValue}>
			{children}
			{/* Global accessibility live regions */}
			<output
				id="global-announcer-polite"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{state.accessibility.announcements.polite}
			</output>
			<div
				id="global-announcer-assertive"
				role="alert"
				aria-live="assertive"
				aria-atomic="true"
				className="sr-only"
			>
				{state.accessibility.announcements.assertive}
			</div>
		</AppContext.Provider>
	);
}

// =============================================================================
// BACKWARDS COMPATIBILITY HOOKS
// =============================================================================

// Legacy hook for existing AppProvider consumers
export function useAppLegacy() {
	const context = useApp();
	return {
		user: context.user,
		selectedHousehold: context.selectedHousehold,
		setSelectedHousehold: context.setSelectedHousehold,
		selectedAnimal: context.selectedAnimal,
		setSelectedAnimal: context.setSelectedAnimal,
		animals: context.animals,
		households: context.households,
		isOffline: context.isOffline,
		pendingSyncCount: context.pendingSyncCount,
		refreshPendingMeds: context.refreshPendingMeds,
	};
}

// Legacy hook for AuthProvider consumers
export function useAuth() {
	const context = useApp();
	return {
		user: context.userProfile,
		households: context.households.map((h) => ({ id: h.id, name: h.name })),
		isAuthenticated: context.isAuthenticated,
		isLoading: context.loading.user,
		error: context.errors.user,
		login: context.login,
		logout: context.logout,
		refreshAuth: context.refreshAuth,
	};
}

// Legacy hook for UserPreferencesProvider consumers
export function useUserPreferencesContext() {
	const context = useApp();
	return {
		isLoaded: !context.loading.user,
		vetMedPreferences: context.preferences,
		householdSettings: context.householdSettings,
		updateVetMedPreferences: context.updateVetMedPreferences,
		updateHouseholdSettings: context.updateHouseholdSettings,
		formatTime: context.formatTime,
		formatWeight: context.formatWeight,
		formatTemperature: context.formatTemperature,
		getUserTimezone: context.getUserTimezone,
		isFirstTimeUser: context.isFirstTimeUser,
		markOnboardingComplete: context.markOnboardingComplete,
	};
}

// Legacy hook for GlobalScreenReaderProvider consumers
export function useScreenReaderAnnouncements() {
	const { announce } = useApp();
	return { announce };
}

// =============================================================================
// SPECIALIZED HOOKS FOR SPECIFIC FEATURES
// =============================================================================

export function useUserTimezone() {
	const { getUserTimezone } = useApp();
	return getUserTimezone();
}

export function useDateTimeFormatting() {
	const { formatTime, preferences } = useApp();

	const formatDate = useCallback(
		(date: Date) => {
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
				timeZone: preferences.defaultTimezone,
			});
		},
		[preferences.defaultTimezone],
	);

	const formatDateTime = useCallback(
		(date: Date) => {
			return `${formatDate(date)} ${formatTime(date)}`;
		},
		[formatDate, formatTime],
	);

	const formatTimeInTimezone = useCallback(
		(date: Date, timezone?: string) => {
			const tz = timezone || preferences.defaultTimezone;
			return preferences.displayPreferences.use24HourTime
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
		},
		[preferences.defaultTimezone, preferences.displayPreferences.use24HourTime],
	);

	return {
		formatTime,
		formatDate,
		formatDateTime,
		formatTimeInTimezone,
	};
}

export function useNotificationPreferences() {
	const { preferences } = useApp();
	return preferences.notificationPreferences;
}

export function useHouseholdInfo() {
	const { householdSettings } = useApp();
	return {
		householdName: householdSettings.primaryHouseholdName,
		location: householdSettings.defaultLocation,
		veterinarian: householdSettings.preferredVeterinarian,
		roles: householdSettings.householdRoles,
		inventoryPreferences: householdSettings.inventoryPreferences,
	};
}

export function useRequireAuth() {
	const { isAuthenticated, loading } = useApp();
	return { isAuthenticated, isLoading: loading.user };
}
