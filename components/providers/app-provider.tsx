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
import { trpc } from "@/server/trpc/client";

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
	const { isAuthenticated } = useAuth();
	const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(
		null,
	);
	const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
	const [isOffline, setIsOffline] = useState(false);
	const [pendingSyncCount, setPendingSyncCount] = useState(0);
	const [households, setHouseholds] = useState<Household[]>([]);

	// Fetch household details from API
	const { data: householdData } = trpc.household.list.useQuery(undefined, {
		enabled: isAuthenticated,
	});

	// Update households when data is fetched
	useEffect(() => {
		if (householdData && householdData.length > 0) {
			const formattedHouseholds: Household[] = householdData.map((h) => ({
				id: h.id,
				name: h.name,
				avatar: undefined, // TODO: Add avatar support
			}));
			setHouseholds(formattedHouseholds);

			// Set the first household as selected if none is selected
			if (!selectedHousehold && formattedHouseholds.length > 0) {
				setSelectedHousehold(formattedHouseholds[0] || null);
			}
		}
	}, [householdData, selectedHousehold]);

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
			{children}
		</AppContext.Provider>
	);
}
