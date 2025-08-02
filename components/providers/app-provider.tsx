"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import { getQueueSize } from "@/lib/offline/db";
import type { User } from "@/server/db/schema/users";
import { trpc } from "@/server/trpc/client";
import { AnimalFormProvider } from "./animal-form-provider";
import { InventoryFormProvider } from "./inventory-form-provider";

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
	const { isAuthenticated, user } = useAuth();
	const [selectedHousehold, setSelectedHouseholdState] =
		useState<Household | null>(null);

	// Wrapper to update both state and localStorage
	const setSelectedHousehold = useCallback((household: Household | null) => {
		setSelectedHouseholdState(household);
		if (typeof window !== "undefined") {
			if (household?.id) {
				localStorage.setItem("selectedHouseholdId", household.id);
			} else {
				localStorage.removeItem("selectedHouseholdId");
			}
		}
	}, []);
	const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
	const [isOffline, setIsOffline] = useState(false);
	const [pendingSyncCount, setPendingSyncCount] = useState(0);
	const [households, setHouseholds] = useState<Household[]>([]);

	// Fetch household details from API
	const { data: householdData } = trpc.household.list.useQuery(undefined, {
		enabled: isAuthenticated,
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
		const count = await getQueueSize(selectedHousehold?.id);
		setPendingSyncCount(count);
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

	// Format animals with placeholder data
	const animals: Animal[] =
		animalData?.map((animal) => ({
			id: animal.id,
			name: animal.name,
			species: animal.species,
			avatar: undefined, // TODO: Add avatar support
			pendingMeds: 0, // TODO: Calculate from actual data
		})) || [];

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
			}}
		>
			<InventoryFormProvider>
				<AnimalFormProvider>{children}</AnimalFormProvider>
			</InventoryFormProvider>
		</AppContext.Provider>
	);
}
