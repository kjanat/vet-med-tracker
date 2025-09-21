"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { vetmedAnimals, vetmedHouseholds } from "@/db/schema";
import { trpc } from "@/server/trpc/client";
import { useAuth } from "./auth-provider";
import { useHouseholdActions } from "./use-household-actions";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

type HouseholdListItem = typeof vetmedHouseholds.$inferSelect & {
  role: string;
  joinedAt: Date;
};

type AnimalFromDatabase = typeof vetmedAnimals.$inferSelect;

export interface Animal {
  id: string;
  name: string;
  species: string;
  avatar?: string;
  pendingMeds: number;
  timezone?: string;
}

export interface Household {
  id: string;
  name: string;
  avatar?: string;
  timezone?: string;
}

interface HouseholdState {
  selectedHouseholdId: string | null;
  selectedAnimalId: string | null;
  households: Household[];
  animals: Animal[];
  loading: {
    households: boolean;
    animals: boolean;
    pendingMeds: boolean;
  };
  errors: {
    households: string | null;
    animals: string | null;
    pendingMeds: string | null;
  };
}

type HouseholdAction =
  | { type: "SET_HOUSEHOLD"; payload: Household | null }
  | { type: "SET_ANIMAL"; payload: Animal | null }
  | { type: "SET_HOUSEHOLDS"; payload: Household[] }
  | { type: "SET_ANIMALS"; payload: Animal[] }
  | {
      type: "SET_LOADING";
      payload: { key: keyof HouseholdState["loading"]; value: boolean };
    }
  | {
      type: "SET_ERROR";
      payload: { key: keyof HouseholdState["errors"]; value: string | null };
    };

// =============================================================================
// REDUCER & HELPERS
// =============================================================================

const initialState: HouseholdState = {
  animals: [],
  errors: {
    animals: null,
    households: null,
    pendingMeds: null,
  },
  households: [],
  loading: {
    animals: false,
    households: false,
    pendingMeds: false,
  },
  selectedAnimalId: null,
  selectedHouseholdId: null,
};

function updateHouseholdLocalStorage(household: Household | null): void {
  if (typeof window === "undefined") return;

  if (household?.id) {
    localStorage.setItem("selectedHouseholdId", household.id);
  } else {
    localStorage.removeItem("selectedHouseholdId");
  }
}

function updateAnimalLocalStorage(animal: Animal | null): void {
  if (typeof window === "undefined") return;

  if (animal?.id) {
    localStorage.setItem("selectedAnimalId", animal.id);
  } else {
    localStorage.removeItem("selectedAnimalId");
  }
}

function handleHouseholdChange(
  state: HouseholdState,
  household: Household | null,
): HouseholdState {
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

function handleAnimalChange(
  state: HouseholdState,
  animal: Animal | null,
): HouseholdState {
  updateAnimalLocalStorage(animal);
  return {
    ...state,
    selectedAnimalId: animal?.id || null,
  };
}

function householdReducer(
  state: HouseholdState,
  action: HouseholdAction,
): HouseholdState {
  switch (action.type) {
    case "SET_HOUSEHOLD":
      return handleHouseholdChange(state, action.payload);

    case "SET_ANIMAL":
      return handleAnimalChange(state, action.payload);

    case "SET_HOUSEHOLDS":
      return { ...state, households: action.payload };

    case "SET_ANIMALS":
      return { ...state, animals: action.payload };

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

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT & PROVIDER
// =============================================================================

export interface HouseholdContextType extends HouseholdState {
  setSelectedHousehold: (household: Household | null) => void;
  setSelectedAnimal: (animal: Animal | null) => void;
  refreshPendingMeds: () => void;
  selectedHousehold: Household | null;
  selectedAnimal: Animal | null;
}

const HouseholdContext = createContext<HouseholdContextType | null>(null);

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error("useHousehold must be used within HouseholdProvider");
  }
  return context;
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(householdReducer, initialState);
  const { user } = useAuth();
  const utils = trpc.useUtils();

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
  // HOUSEHOLDS MANAGEMENT
  // =============================================================================

  // Fetch household details from API
  const { data: householdData } = trpc.household.list.useQuery(undefined, {
    enabled: Boolean(user),
  });

  const formatHouseholdData = useCallback(
    (data: HouseholdListItem[]) =>
      data.map((h) => ({
        avatar: undefined,
        id: h.id,
        name: h.name,
        timezone: h.timezone,
      })),
    [],
  );

  const restoreHouseholdFromStorage = useCallback(
    (households: Household[]): Household | null => {
      if (typeof window === "undefined") return null;

      const savedHouseholdId = localStorage.getItem("selectedHouseholdId");
      return households.find((h) => h.id === savedHouseholdId) || null;
    },
    [],
  );

  const selectDefaultHousehold = useCallback(
    (households: Household[]) => {
      const savedHousehold = restoreHouseholdFromStorage(households);

      if (savedHousehold) {
        dispatch({ payload: savedHousehold, type: "SET_HOUSEHOLD" });
      } else if (households.length > 0) {
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

  // =============================================================================
  // ANIMALS MANAGEMENT
  // =============================================================================

  // Fetch animals for selected household
  const { data: animalData } = trpc.household.getAnimals.useQuery(
    { householdId: state.selectedHouseholdId || "" },
    { enabled: Boolean(state.selectedHouseholdId) },
  );

  // Fetch pending medications count
  const { data: pendingMedsData } = trpc.household.getPendingMeds.useQuery(
    { householdId: state.selectedHouseholdId || "" },
    {
      enabled: Boolean(state.selectedHouseholdId),
      refetchInterval: 60000, // Refresh every minute
    },
  );

  const formatAnimalData = useCallback(
    (
      data: AnimalFromDatabase[],
      pendingByAnimal: Record<string, number> = {},
    ) =>
      data.map((animal) => ({
        avatar: undefined,
        id: animal.id,
        name: animal.name,
        pendingMeds: pendingByAnimal[animal.id] || 0,
        species: animal.species,
        timezone: animal.timezone,
      })),
    [],
  );

  const restoreAnimalFromStorage = useCallback(
    (animals: Animal[]): Animal | null => {
      if (typeof window === "undefined") return null;

      const savedAnimalId = localStorage.getItem("selectedAnimalId");
      return animals.find((a) => a.id === savedAnimalId) || null;
    },
    [],
  );

  const validateSelectedAnimal = useCallback(
    (animals: Animal[]) => {
      if (state.selectedAnimalId) {
        const stillExists = animals.some(
          (a) => a.id === state.selectedAnimalId,
        );
        if (!stillExists) {
          dispatch({ payload: null, type: "SET_ANIMAL" });
        }
      } else {
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
  // ACTION HANDLERS
  // =============================================================================

  const { refreshPendingMeds, setSelectedAnimal, setSelectedHousehold } =
    useHouseholdActions<Household, Animal>({
      dispatch,
      invalidatePendingMeds: utils.household.getPendingMeds.invalidate,
      selectedHouseholdId: state.selectedHouseholdId,
    });

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: HouseholdContextType = useMemo(
    () => ({
      ...state,
      refreshPendingMeds,
      selectedAnimal,
      selectedHousehold,
      setSelectedAnimal,
      setSelectedHousehold,
    }),
    [
      state,
      selectedHousehold,
      selectedAnimal,
      setSelectedHousehold,
      setSelectedAnimal,
      refreshPendingMeds,
    ],
  );

  return (
    <HouseholdContext.Provider value={contextValue}>
      {children}
    </HouseholdContext.Provider>
  );
}
