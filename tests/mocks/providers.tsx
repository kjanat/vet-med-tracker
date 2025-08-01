import type React from "react";
import { vi } from "vitest";
import { AppProvider } from "@/components/providers/app-provider";

const mockAnimals = [
	{
		id: "animal-1",
		name: "Buddy",
		species: "Dog",
		pendingMeds: 2,
		avatar: "https://example.com/buddy.jpg",
	},
	{
		id: "animal-2",
		name: "Mittens",
		species: "Cat",
		pendingMeds: 1,
		avatar: "https://example.com/mittens.jpg",
	},
];

const mockHousehold = {
	id: "household-1",
	name: "Test Household",
	role: "OWNER" as const,
};

export const MockAppProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	return <AppProvider>{children}</AppProvider>;
};

// Mock the useApp hook
vi.mock("@/components/providers/app-provider", async () => {
	const actual = await vi.importActual<
		typeof import("@/components/providers/app-provider")
	>("@/components/providers/app-provider");

	return {
		...actual,
		useApp: () => ({
			animals: mockAnimals,
			currentHousehold: mockHousehold,
			isOnline: true,
			setCurrentAnimal: vi.fn(),
			setCurrentHousehold: vi.fn(),
		}),
	};
});
