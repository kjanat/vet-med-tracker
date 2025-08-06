"use client";

import { useUser } from "@clerk/nextjs";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { vetmedUsers } from "@/db/schema";

type User = typeof vetmedUsers.$inferSelect;

import { getQueueSize } from "@/lib/offline/db";
import { trpc } from "@/server/trpc/client";

// Minimal Animal interface for app-provider context
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

interface AppContextType {
	user: User | null;
	selectedHousehold: Household | null;
	setSelectedHousehold: (household: Household | null) => void;
	selectedAnimal: Animal | null;
	setSelectedAnimal: (animal: Animal | null) => void;
	animals: Animal[];
	households: Household[];
	isOffline: boolean;
	pendingSyncCount: number;
	// Function to refresh pending medication counts
	refreshPendingMeds: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error("useApp must be used within AppProvider");
	}
	return context;
}

export function AppProvider({ children }: { children: ReactNode }) {
	const { user: clerkUser, isLoaded } = useUser();
	const [selectedHousehold, setSelectedHouseholdState] =
		useState<Household | null>(null);
	const utils = trpc.useUtils();

	// Wrapper to update both state and localStorage
	const setSelectedHousehold = useCallback(
		(household: Household | null) => {
			setSelectedHouseholdState(household);
			if (typeof window !== "undefined") {
				if (household?.id) {
					localStorage.setItem("selectedHouseholdId", household.id);
				} else {
					localStorage.removeItem("selectedHouseholdId");
				}
			}
			// Clear selected animal when changing households
			if (household?.id !== selectedHousehold?.id) {
				setSelectedAnimalState(null);
				if (typeof window !== "undefined") {
					localStorage.removeItem("selectedAnimalId");
				}
			}
		},
		[selectedHousehold?.id],
	);
	const [selectedAnimal, setSelectedAnimalState] = useState<Animal | null>(
		null,
	);

	// Wrapper to update both state and localStorage
	const setSelectedAnimal = useCallback((animal: Animal | null) => {
		setSelectedAnimalState(animal);
		if (typeof window !== "undefined") {
			if (animal?.id) {
				localStorage.setItem("selectedAnimalId", animal.id);
			} else {
				localStorage.removeItem("selectedAnimalId");
			}
		}
	}, []);
	const [isOffline, setIsOffline] = useState(false);
	const [pendingSyncCount, setPendingSyncCount] = useState(0);
	const [households, setHouseholds] = useState<Household[]>([]);

	// Convert Clerk user to minimal user format
	const user = clerkUser
		? ({
				id: clerkUser.id,
				name:
					clerkUser.firstName ||
					clerkUser.emailAddresses[0]?.emailAddress ||
					"Unknown",
				email: clerkUser.emailAddresses[0]?.emailAddress || "",
				image: clerkUser.imageUrl || null,
				emailVerified: null, // Clerk handles verification
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				// Add required fields with defaults
				clerkUserId: clerkUser.id,
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
			} as User)
		: null;

	// Fetch household details from API
	const { data: householdData } = trpc.household.list.useQuery(undefined, {
		enabled: isLoaded && !!clerkUser,
	});

	// Helper function to restore household from localStorage
	const restoreHouseholdFromStorage = useCallback(
		(formattedHouseholds: Household[]): Household | null => {
			if (typeof window === "undefined") return null;

			const savedHouseholdId = localStorage.getItem("selectedHouseholdId");
			if (!savedHouseholdId) return null;

			const savedHousehold = formattedHouseholds.find(
				(h) => h.id === savedHouseholdId,
			);

			if (!savedHousehold) {
				console.warn(
					`Household ID ${savedHouseholdId} not found in user's households. Clearing localStorage.`,
				);
				localStorage.removeItem("selectedHouseholdId");
			}

			return savedHousehold || null;
		},
		[],
	);

	// Helper function to restore animal from localStorage
	const restoreAnimalFromStorage = useCallback(
		(availableAnimals: Animal[]): Animal | null => {
			if (typeof window === "undefined") return null;

			const savedAnimalId = localStorage.getItem("selectedAnimalId");
			if (!savedAnimalId) return null;

			const savedAnimal = availableAnimals.find((a) => a.id === savedAnimalId);

			if (!savedAnimal) {
				console.warn(
					`Animal ID ${savedAnimalId} not found in household's animals. Clearing localStorage.`,
				);
				localStorage.removeItem("selectedAnimalId");
			}

			return savedAnimal || null;
		},
		[],
	);

	// Helper function to select initial household
	const selectInitialHousehold = useCallback(
		(formattedHouseholds: Household[]): void => {
			if (selectedHousehold || formattedHouseholds.length === 0) return;

			// Try to restore from localStorage first
			const restoredHousehold =
				restoreHouseholdFromStorage(formattedHouseholds);
			if (restoredHousehold) {
				setSelectedHousehold(restoredHousehold);
				return;
			}

			// Fallback to first household
			setSelectedHousehold(formattedHouseholds[0] || null);
		},
		[selectedHousehold, setSelectedHousehold, restoreHouseholdFromStorage],
	);

	// Update households when data is fetched
	useEffect(() => {
		if (!householdData || householdData.length === 0) return;

		const formattedHouseholds: Household[] = householdData.map((h) => ({
			id: h.id,
			name: h.name,
			avatar: undefined, // TODO: Add avatar support
		}));

		setHouseholds(formattedHouseholds);
		selectInitialHousehold(formattedHouseholds);
	}, [householdData, selectInitialHousehold]);

	// Update pending sync count
	const updatePendingSyncCount = useCallback(async () => {
		try {
			const count = await getQueueSize(selectedHousehold?.id);
			setPendingSyncCount(count);
		} catch (error) {
			console.warn("Failed to get pending sync count:", error);
			// Set to 0 as fallback - this prevents showing incorrect sync indicators
			setPendingSyncCount(0);
		}
	}, [selectedHousehold?.id]);

	useEffect(() => {
		updatePendingSyncCount();
		// Update count every 5 seconds
		const interval = setInterval(updatePendingSyncCount, 5000);
		return () => clearInterval(interval);
	}, [updatePendingSyncCount]);

	useEffect(() => {
		const handleOnline = () => setIsOffline(false);
		const handleOffline = () => setIsOffline(true);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		setIsOffline(!navigator.onLine);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// Fetch animals for selected household
	const { data: animalData } = trpc.household.getAnimals.useQuery(
		{ householdId: selectedHousehold?.id || "" },
		{ enabled: !!selectedHousehold?.id },
	);

	// Fetch pending medications count for all animals in household
	const { data: pendingMedsData } = trpc.household.getPendingMeds.useQuery(
		{
			householdId: selectedHousehold?.id || "",
		},
		{
			enabled: !!selectedHousehold?.id,
			refetchInterval: 60000, // Refresh every minute
		},
	);

	// Function to refresh pending medication counts
	const refreshPendingMeds = useCallback(() => {
		if (selectedHousehold?.id) {
			utils.household.getPendingMeds.invalidate({
				householdId: selectedHousehold.id,
			});
		}
	}, [utils.household.getPendingMeds, selectedHousehold?.id]);

	// Format animals with pending medication counts
	const animals: Animal[] = useMemo(() => {
		if (!animalData) return [];

		const pendingByAnimal = pendingMedsData?.byAnimal || {};

		return animalData.map((animal) => ({
			id: animal.id,
			name: animal.name,
			species: animal.species,
			avatar: undefined, // TODO: Add avatar support
			pendingMeds: pendingByAnimal[animal.id] || 0,
		}));
	}, [animalData, pendingMedsData]);

	// Restore selected animal when animals change
	useEffect(() => {
		if (animals.length === 0) return;

		// If no animal is selected, try to restore from localStorage
		if (!selectedAnimal) {
			const restoredAnimal = restoreAnimalFromStorage(animals);
			if (restoredAnimal) {
				setSelectedAnimal(restoredAnimal);
			}
		} else {
			// Verify the selected animal still exists in the current household
			const stillExists = animals.some((a) => a.id === selectedAnimal.id);
			if (!stillExists) {
				console.warn(
					`Selected animal ${selectedAnimal.name} no longer exists in household. Clearing selection.`,
				);
				setSelectedAnimal(null);
			}
		}
	}, [animals, selectedAnimal, restoreAnimalFromStorage, setSelectedAnimal]);

	return (
		<AppContext.Provider
			value={{
				user,
				selectedHousehold,
				setSelectedHousehold,
				selectedAnimal,
				setSelectedAnimal,
				animals,
				households,
				isOffline,
				pendingSyncCount,
				refreshPendingMeds,
			}}
		>
			{children}
		</AppContext.Provider>
	);
}
