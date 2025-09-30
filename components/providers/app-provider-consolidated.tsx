"use client";

import { useUser } from "@stackframe/stack";
import {
  createContext,
  type ReactNode,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { vetmedAnimals, vetmedHouseholds, vetmedUsers } from "@/db/schema";
import {
  defaultUserPreferences,
  defaultUserProfile,
} from "@/db/schema/user-defaults";
import { trpc } from "@/server/trpc/client";
import { useHouseholdActions } from "./use-household-actions";
import { useStackMetadataPreferences } from "./use-stack-metadata-preferences";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type User = typeof vetmedUsers.$inferSelect;

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
  joinedAt: Date;
};

type AnimalFromDatabase = typeof vetmedAnimals.$inferSelect;

interface Animal {
  id: string;
  name: string;
  species: string;
  avatar?: string;
  pendingMeds: number;
  timezone?: string;
}

interface Household {
  id: string;
  name: string;
  avatar?: string;
  timezone?: string;
}

export interface UserProfile {
  id: string;
  stackUserId: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  firstName?: string | null;
  lastName?: string | null;
  pronouns?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  socialLinks?: Record<string, string> | null;
  profileVisibility?: {
    showEmail?: boolean | null;
    showPhone?: boolean | null;
    showBio?: boolean | null;
    showLocation?: boolean | null;
    showSocialLinks?: boolean | null;
  } | null;
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
    theme?: string | null;
    weekStartsOn?: number | null;
  };
  onboarding: {
    complete: boolean | null;
    completedAt: Date | null;
  };
  availableHouseholds: Array<{
    id: string;
    name: string;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
    membership: {
      id: string;
      createdAt: Date;
      updatedAt: Date;
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

  // Sync State
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

const defaultAccessibilityState: AccessibilityState = {
  announcements: {
    assertive: "",
    polite: "",
  },
  fontSize: "medium",
  highContrast: false,
  reducedMotion: false,
};

const initialState: AppState = {
  accessibility: defaultAccessibilityState,
  animals: [],
  authStatus: "loading",
  errors: {
    animals: null,
    households: null,
    pendingMeds: null,
    user: null,
  },
  householdSettings: defaultHouseholdSettings,
  households: [],
  isAuthenticated: false,
  isFirstTimeUser: false,
  loading: {
    animals: false,
    households: false,
    pendingMeds: false,
    user: true,
  },
  pendingSyncCount: 0,
  preferences: defaultVetMedPreferences,
  selectedAnimalId: null,
  selectedHouseholdId: null,
  user: null,
  userProfile: null,
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
      selectedAnimalId: null,
      selectedHouseholdId: householdId,
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
        authStatus: action.payload ? "authenticated" : "unauthenticated",
        isAuthenticated: Boolean(action.payload),
        user: action.payload,
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

// Export AppContext and AppContextType for testing purposes
export { AppContext };
export type { AppContextType };

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within ConsolidatedAppProvider");
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
  const { mutateAsync: persistPreferences } =
    trpc.user.updatePreferences.useMutation();

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
      createdAt: new Date(),
      defaultAnimalId: null,
      defaultHouseholdId: null,
      email: stackUser.primaryEmail || "",
      emailVerified: null,
      id: stackUser.id,
      image: stackUser.profileImageUrl || null,
      name: stackUser.displayName || stackUser.primaryEmail || "Unknown",
      onboardingComplete: null,
      onboardingCompletedAt: null,
      preferences: structuredClone(defaultUserPreferences),
      profile: structuredClone(defaultUserProfile),
      stackUserId: stackUser.id,
      updatedAt: new Date(),
    }),
    [],
  );

  // Update user when Stack user changes
  useEffect(() => {
    const isLoaded = true; // Stack Auth loads synchronously
    if (isLoaded) {
      if (stackUser) {
        const user = convertStackUser(stackUser);
        dispatch({ payload: user, type: "SET_USER" });
        dispatch({ payload: "authenticated", type: "SET_AUTH_STATUS" });
      } else {
        dispatch({ payload: null, type: "SET_USER" });
        dispatch({ payload: "unauthenticated", type: "SET_AUTH_STATUS" });
      }
      dispatch({ payload: { key: "user", value: false }, type: "SET_LOADING" });
    }
  }, [stackUser, convertStackUser]);

  // Get user profile data from tRPC
  const { data: rawUserProfile, refetch: refetchProfile } =
    trpc.user.getProfile.useQuery(undefined, { enabled: Boolean(stackUser) });

  // Transform API response to match UserProfile interface with proper Date objects
  const userProfile = useMemo(() => {
    if (!rawUserProfile) return null;

    return {
      ...rawUserProfile,
      availableHouseholds: rawUserProfile.availableHouseholds.map(
        (household) => ({
          ...household,
          createdAt: new Date(household.createdAt),
          membership: {
            ...household.membership,
            createdAt: new Date(household.membership.createdAt),
            updatedAt: new Date(household.membership.updatedAt),
          },
          updatedAt: new Date(household.updatedAt),
        }),
      ),
      onboarding: {
        ...rawUserProfile.onboarding,
        completedAt: rawUserProfile.onboarding.completedAt
          ? new Date(rawUserProfile.onboarding.completedAt)
          : null,
      },
    };
  }, [rawUserProfile]);

  useEffect(() => {
    if (userProfile) {
      dispatch({ payload: userProfile, type: "SET_USER_PROFILE" });
    }
  }, [userProfile]);

  // =============================================================================
  // PREFERENCES MANAGEMENT
  // =============================================================================

  // Load preferences from Stack user metadata
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
  // HOUSEHOLDS & ANIMALS MANAGEMENT
  // =============================================================================

  // Fetch household details from API
  const { data: householdData } = trpc.household.list.useQuery(undefined, {
    enabled: Boolean(stackUser),
  });

  // Helper function to format household data
  const formatHouseholdData = useCallback(
    (data: HouseholdListItem[]) =>
      data.map((h) => ({
        avatar: undefined, // Avatar support will be added when avatar storage is implemented
        id: h.id,
        name: h.name,
        timezone: h.timezone,
      })),
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
        dispatch({ payload: savedHousehold, type: "SET_HOUSEHOLD" });
      } else if (households.length > 0) {
        // Fallback to first household
        dispatch({ payload: households[0] || null, type: "SET_HOUSEHOLD" });
      }
    },
    [restoreHouseholdFromStorage],
  );

  // Update households when data is fetched
  useEffect(() => {
    if (!householdData || householdData.length === 0) return;

    const formattedHouseholds = formatHouseholdData(householdData);
    dispatch({ payload: formattedHouseholds, type: "SET_HOUSEHOLDS" });

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
  const { data: animalData } = trpc.animals.list.useQuery(
    { householdId: state.selectedHouseholdId || "" },
    { enabled: Boolean(state.selectedHouseholdId) },
  );

  // Fetch pending medications count
  // TODO: getPendingMeds doesn't exist on any router - needs implementation
  // Temporarily using undefined until the API method is added
  const pendingMedsData = undefined;
  /*
  const { data: pendingMedsData } = trpc.household.getPendingMeds.useQuery(
    { householdId: state.selectedHouseholdId || "" },
    {
      enabled: Boolean(state.selectedHouseholdId),
      refetchInterval: 60000, // Refresh every minute
    },
  );
  */

  // Helper function to format animal data with pending meds
  const formatAnimalData = useCallback(
    (
      data: AnimalFromDatabase[],
      pendingByAnimal: Record<string, number> = {},
    ) =>
      data.map((animal) => ({
        avatar: animal.photoUrl || undefined, // Use animal's photo as avatar
        id: animal.id,
        name: animal.name,
        pendingMeds: pendingByAnimal[animal.id] || 0,
        species: animal.species,
        timezone: animal.timezone,
      })),
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
          dispatch({ payload: null, type: "SET_ANIMAL" });
        }
      } else {
        // Try to restore from localStorage
        const savedAnimal = restoreAnimalFromStorage(animals);
        if (savedAnimal) {
          dispatch({ payload: savedAnimal, type: "SET_ANIMAL" });
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

    dispatch({ payload: formattedAnimals, type: "SET_ANIMALS" });
    validateSelectedAnimal(formattedAnimals);
  }, [animalData, pendingMedsData, formatAnimalData, validateSelectedAnimal]);

  // =============================================================================
  // SYNC MANAGEMENT
  // =============================================================================

  // Simplified: No pending sync queue currently implemented
  const updatePendingSyncCount = useCallback(async () => {
    dispatch({ payload: 0, type: "SET_PENDING_SYNC_COUNT" });
  }, []);

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
          payload: { message: "", priority: "polite" },
          type: "ANNOUNCE",
        });
      }, 1000);
      timeoutRefs.current.set("polite", timeoutId);
    }

    if (assertive) {
      const timeoutId = window.setTimeout(() => {
        dispatch({
          payload: { message: "", priority: "assertive" },
          type: "ANNOUNCE",
        });
      }, 1000);
      timeoutRefs.current.set("assertive", timeoutId);
    }

    return () => {
      const refs = timeoutRefs.current;
      refs.forEach((id) => {
        clearTimeout(id);
      });
      refs.clear();
    };
  }, [state.accessibility.announcements]);

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const { refreshPendingMeds, setSelectedAnimal, setSelectedHousehold } =
    useHouseholdActions<Household, Animal>({
      dispatch,
      // TODO: invalidatePendingMeds needs implementation when getPendingMeds is added
      invalidatePendingMeds: () => Promise.resolve(),
      selectedHouseholdId: state.selectedHouseholdId,
    });

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

      const newPreferences = {
        ...defaultVetMedPreferences,
        ...state.preferences,
        ...updates,
      };

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

      const cachedHouseholds = utils.household.list.getData();

      try {
        await persistPreferences({
          vetMedPreferences: {
            defaultAnimalId: newPreferences.defaultAnimalId,
            defaultHouseholdId:
              newPreferences.defaultHouseholdId ||
              cachedHouseholds?.[0]?.id ||
              undefined,
            defaultTimezone: newPreferences.defaultTimezone,
            displayPreferences: newPreferences.displayPreferences,
            emergencyContactName: newPreferences.emergencyContactName,
            emergencyContactPhone: newPreferences.emergencyContactPhone,
            notificationPreferences: newPreferences.notificationPreferences,
            preferredPhoneNumber: newPreferences.preferredPhoneNumber,
          },
        });
      } catch (error) {
        console.warn("Failed to persist preferences to database:", error);
      }
    },
    [
      stackUser,
      state.preferences,
      persistPreferences,
      utils.household.list.getData,
    ],
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

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      dispatch({ payload: { message, priority }, type: "ANNOUNCE" });
    },
    [],
  );

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

  const contextValue: AppContextType = useMemo(
    () => ({
      // State
      ...state,
      announce,
      formatTemperature,

      // Utilities
      formatTime,
      formatWeight,
      getUserTimezone,
      login,
      logout,
      markOnboardingComplete,
      refreshAuth,
      refreshPendingMeds,
      selectedAnimal,
      selectedHousehold,
      setSelectedAnimal,

      // Actions
      setSelectedHousehold,
      updateHouseholdSettings,
      updateVetMedPreferences,
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
    <Suspense fallback={<div>Loading...</div>}>
      <AppContext.Provider value={contextValue}>
        {children}
        {/* Global accessibility live regions */}
        <output
          aria-atomic="true"
          aria-live="polite"
          className="sr-only"
          id="global-announcer-polite"
        >
          {state.accessibility.announcements.polite}
        </output>
        <div
          aria-atomic="true"
          aria-live="assertive"
          className="sr-only"
          id="global-announcer-assertive"
          role="alert"
        >
          {state.accessibility.announcements.assertive}
        </div>
      </AppContext.Provider>
    </Suspense>
  );
}

// =============================================================================
// BACKWARDS COMPATIBILITY HOOKS
// =============================================================================

// Legacy hook for existing AppProvider consumers
export function useAppLegacy() {
  const context = useApp();
  return {
    animals: context.animals,
    households: context.households,
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
export function useAuth() {
  const context = useApp();
  return {
    error: context.errors?.user || null,
    households: (context.households || []).map((h) => ({
      id: h.id,
      name: h.name,
    })),
    isAuthenticated: context.isAuthenticated,
    isLoading: context.loading?.user || false,
    login: context.login,
    logout: context.logout,
    refreshAuth: context.refreshAuth,
    user: context.userProfile,
  };
}

// Legacy hook for UserPreferencesProvider consumers
export function useUserPreferencesContext() {
  const context = useApp();
  return {
    formatTemperature: context.formatTemperature,
    formatTime: context.formatTime,
    formatWeight: context.formatWeight,
    getUserTimezone: context.getUserTimezone,
    householdSettings: context.householdSettings,
    isFirstTimeUser: context.isFirstTimeUser,
    isLoaded: !context.loading?.user,
    markOnboardingComplete: context.markOnboardingComplete,
    updateHouseholdSettings: context.updateHouseholdSettings,
    updateVetMedPreferences: context.updateVetMedPreferences,
    vetMedPreferences: context.preferences,
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
  const { preferences } = useApp();
  return preferences.notificationPreferences;
}

export function useHouseholdInfo() {
  const { householdSettings } = useApp();
  return {
    householdName: householdSettings.primaryHouseholdName,
    inventoryPreferences: householdSettings.inventoryPreferences,
    location: householdSettings.defaultLocation,
    roles: householdSettings.householdRoles,
    veterinarian: householdSettings.preferredVeterinarian,
  };
}

export function useRequireAuth() {
  const { isAuthenticated, loading } = useApp();
  return { isAuthenticated, isLoading: loading.user };
}
