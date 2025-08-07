/**
 * @vitest-environment jsdom
 */

import { ClerkProvider } from "@clerk/nextjs";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import {
	ConsolidatedAppProvider,
	useApp,
	useAuth,
	useScreenReaderAnnouncements,
	useUserPreferencesContext,
} from "../app-provider-consolidated";

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
	useUser: () => ({
		user: {
			id: "user_123",
			firstName: "John",
			emailAddresses: [{ emailAddress: "john@example.com" }],
			imageUrl: "https://example.com/avatar.jpg",
			unsafeMetadata: {},
		},
		isLoaded: true,
	}),
	useClerk: () => ({
		openSignIn: vi.fn(),
		signOut: vi.fn(),
	}),
	ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock tRPC
vi.mock("@/server/trpc/client", () => ({
	trpc: {
		useUtils: () => ({
			household: {
				getPendingMeds: {
					invalidate: vi.fn(),
				},
			},
		}),
		household: {
			list: {
				useQuery: () => ({
					data: [
						{ id: "household_1", name: "My Family" },
						{ id: "household_2", name: "Test Household" },
					],
				}),
			},
			getAnimals: {
				useQuery: () => ({
					data: [
						{ id: "animal_1", name: "Buddy", species: "dog" },
						{ id: "animal_2", name: "Fluffy", species: "cat" },
					],
				}),
			},
			getPendingMeds: {
				useQuery: () => ({
					data: {
						byAnimal: {
							animal_1: 2,
							animal_2: 1,
						},
					},
				}),
			},
		},
		user: {
			getProfile: {
				useQuery: () => ({
					data: {
						id: "user_123",
						name: "John Doe",
						email: "john@example.com",
						preferences: {},
						onboarding: { complete: true, completedAt: null },
						availableHouseholds: [],
						currentHouseholdId: null,
					},
					isLoading: false,
					refetch: vi.fn(),
				}),
			},
		},
	},
}));

// Mock offline database
vi.mock("@/lib/offline/db", () => ({
	getQueueSize: vi.fn().mockResolvedValue(0),
}));

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

// Test wrapper
const TestWrapper = ({ children }: { children: ReactNode }) => (
	<ClerkProvider publishableKey="test">
		<ConsolidatedAppProvider>{children}</ConsolidatedAppProvider>
	</ClerkProvider>
);

describe("ConsolidatedAppProvider", () => {
	beforeEach(() => {
		localStorageMock.clear();
		vi.clearAllMocks();
	});

	describe("useApp hook", () => {
		it("provides all expected values", () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			expect(result.current.user).toBeDefined();
			expect(result.current.households).toEqual([]);
			expect(result.current.animals).toEqual([]);
			expect(result.current.selectedHousehold).toBeNull();
			expect(result.current.selectedAnimal).toBeNull();
			expect(result.current.isAuthenticated).toBe(false);
			expect(result.current.authStatus).toBe("loading");
			expect(result.current.isOffline).toBe(false);
			expect(result.current.pendingSyncCount).toBe(0);
		});

		it("provides all expected functions", () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			expect(typeof result.current.setSelectedHousehold).toBe("function");
			expect(typeof result.current.setSelectedAnimal).toBe("function");
			expect(typeof result.current.refreshPendingMeds).toBe("function");
			expect(typeof result.current.login).toBe("function");
			expect(typeof result.current.logout).toBe("function");
			expect(typeof result.current.refreshAuth).toBe("function");
			expect(typeof result.current.updateVetMedPreferences).toBe("function");
			expect(typeof result.current.updateHouseholdSettings).toBe("function");
			expect(typeof result.current.announce).toBe("function");
			expect(typeof result.current.formatTime).toBe("function");
			expect(typeof result.current.formatWeight).toBe("function");
			expect(typeof result.current.formatTemperature).toBe("function");
			expect(typeof result.current.getUserTimezone).toBe("function");
		});

		it("allows setting selected household", () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			const testHousehold = { id: "test_123", name: "Test Household" };

			act(() => {
				result.current.setSelectedHousehold(testHousehold);
			});

			expect(result.current.selectedHouseholdId).toBe("test_123");
			expect(localStorageMock.getItem("selectedHouseholdId")).toBe("test_123");
		});

		it("allows setting selected animal", () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			const testAnimal = {
				id: "animal_123",
				name: "Test Pet",
				species: "dog",
				pendingMeds: 0,
			};

			act(() => {
				result.current.setSelectedAnimal(testAnimal);
			});

			expect(result.current.selectedAnimalId).toBe("animal_123");
			expect(localStorageMock.getItem("selectedAnimalId")).toBe("animal_123");
		});

		it("clears selected animal when changing household", () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			// Set initial selections
			act(() => {
				result.current.setSelectedHousehold({ id: "house_1", name: "House 1" });
				result.current.setSelectedAnimal({
					id: "animal_1",
					name: "Pet 1",
					species: "dog",
					pendingMeds: 0,
				});
			});

			expect(result.current.selectedHouseholdId).toBe("house_1");
			expect(result.current.selectedAnimalId).toBe("animal_1");

			// Change household
			act(() => {
				result.current.setSelectedHousehold({ id: "house_2", name: "House 2" });
			});

			expect(result.current.selectedHouseholdId).toBe("house_2");
			expect(result.current.selectedAnimalId).toBeNull();
		});
	});

	describe("useAuth backwards compatibility", () => {
		it("provides expected auth interface", () => {
			const { result } = renderHook(() => useAuth(), {
				wrapper: TestWrapper,
			});

			expect(result.current).toHaveProperty("user");
			expect(result.current).toHaveProperty("households");
			expect(result.current).toHaveProperty("isAuthenticated");
			expect(result.current).toHaveProperty("isLoading");
			expect(result.current).toHaveProperty("error");
			expect(result.current).toHaveProperty("login");
			expect(result.current).toHaveProperty("logout");
			expect(result.current).toHaveProperty("refreshAuth");

			expect(typeof result.current.login).toBe("function");
			expect(typeof result.current.logout).toBe("function");
			expect(typeof result.current.refreshAuth).toBe("function");
		});
	});

	describe("useUserPreferencesContext backwards compatibility", () => {
		it("provides expected preferences interface", () => {
			const { result } = renderHook(() => useUserPreferencesContext(), {
				wrapper: TestWrapper,
			});

			expect(result.current).toHaveProperty("isLoaded");
			expect(result.current).toHaveProperty("vetMedPreferences");
			expect(result.current).toHaveProperty("householdSettings");
			expect(result.current).toHaveProperty("updateVetMedPreferences");
			expect(result.current).toHaveProperty("updateHouseholdSettings");
			expect(result.current).toHaveProperty("formatTime");
			expect(result.current).toHaveProperty("formatWeight");
			expect(result.current).toHaveProperty("formatTemperature");
			expect(result.current).toHaveProperty("getUserTimezone");
			expect(result.current).toHaveProperty("isFirstTimeUser");
			expect(result.current).toHaveProperty("markOnboardingComplete");

			expect(typeof result.current.updateVetMedPreferences).toBe("function");
			expect(typeof result.current.updateHouseholdSettings).toBe("function");
			expect(typeof result.current.formatTime).toBe("function");
			expect(typeof result.current.formatWeight).toBe("function");
			expect(typeof result.current.formatTemperature).toBe("function");
			expect(typeof result.current.getUserTimezone).toBe("function");
			expect(typeof result.current.markOnboardingComplete).toBe("function");
		});

		it("formats time correctly", () => {
			const { result } = renderHook(() => useUserPreferencesContext(), {
				wrapper: TestWrapper,
			});

			const testDate = new Date("2024-01-01T14:30:00Z");
			const formattedTime = result.current.formatTime(testDate);

			// Should format in 12-hour format by default
			expect(formattedTime).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
		});

		it("formats weight correctly", () => {
			const { result } = renderHook(() => useUserPreferencesContext(), {
				wrapper: TestWrapper,
			});

			const weightInKg = 20.5;
			const formattedWeight = result.current.formatWeight(weightInKg);

			// Should format in lbs by default
			expect(formattedWeight).toMatch(/\d+\.\d+ lbs/);
		});

		it("formats temperature correctly", () => {
			const { result } = renderHook(() => useUserPreferencesContext(), {
				wrapper: TestWrapper,
			});

			const tempInCelsius = 20;
			const formattedTemp = result.current.formatTemperature(tempInCelsius);

			// Should format in fahrenheit by default
			expect(formattedTemp).toMatch(/\d+\.\d+°F/);
		});
	});

	describe("useScreenReaderAnnouncements backwards compatibility", () => {
		it("provides announce function", () => {
			const { result } = renderHook(() => useScreenReaderAnnouncements(), {
				wrapper: TestWrapper,
			});

			expect(result.current).toHaveProperty("announce");
			expect(typeof result.current.announce).toBe("function");
		});

		it("allows making announcements", () => {
			const { result } = renderHook(() => useScreenReaderAnnouncements(), {
				wrapper: TestWrapper,
			});

			expect(() => {
				result.current.announce("Test message", "polite");
			}).not.toThrow();

			expect(() => {
				result.current.announce("Urgent message", "assertive");
			}).not.toThrow();
		});
	});

	describe("Accessibility features", () => {
		it("renders accessibility live regions", () => {
			renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			const politeRegion = document.getElementById("global-announcer-polite");
			const assertiveRegion = document.getElementById(
				"global-announcer-assertive",
			);

			expect(politeRegion).toBeInTheDocument();
			expect(assertiveRegion).toBeInTheDocument();
			expect(politeRegion).toHaveAttribute("aria-live", "polite");
			expect(assertiveRegion).toHaveAttribute("aria-live", "assertive");
		});

		it("updates accessibility announcements", async () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			act(() => {
				result.current.announce("Test polite message", "polite");
			});

			expect(result.current.accessibility.announcements.polite).toBe(
				"Test polite message",
			);

			act(() => {
				result.current.announce("Test assertive message", "assertive");
			});

			expect(result.current.accessibility.announcements.assertive).toBe(
				"Test assertive message",
			);
		});
	});

	describe("Error handling", () => {
		it("throws error when used outside provider", () => {
			expect(() => renderHook(() => useApp())).toThrow(
				"useApp must be used within AppProvider",
			);
		});
	});

	describe("Local storage persistence", () => {
		it("persists household selection", () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			const household = { id: "persist_test", name: "Persist Test" };

			act(() => {
				result.current.setSelectedHousehold(household);
			});

			expect(localStorageMock.getItem("selectedHouseholdId")).toBe(
				"persist_test",
			);
		});

		it("persists animal selection", () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			const animal = {
				id: "persist_animal",
				name: "Persist Pet",
				species: "cat",
				pendingMeds: 1,
			};

			act(() => {
				result.current.setSelectedAnimal(animal);
			});

			expect(localStorageMock.getItem("selectedAnimalId")).toBe(
				"persist_animal",
			);
		});

		it("removes selections when set to null", () => {
			const { result } = renderHook(() => useApp(), {
				wrapper: TestWrapper,
			});

			// Set initial values
			act(() => {
				result.current.setSelectedHousehold({ id: "test", name: "Test" });
				result.current.setSelectedAnimal({
					id: "test",
					name: "Test",
					species: "dog",
					pendingMeds: 0,
				});
			});

			expect(localStorageMock.getItem("selectedHouseholdId")).toBe("test");
			expect(localStorageMock.getItem("selectedAnimalId")).toBe("test");

			// Clear selections
			act(() => {
				result.current.setSelectedHousehold(null);
				result.current.setSelectedAnimal(null);
			});

			expect(localStorageMock.getItem("selectedHouseholdId")).toBeNull();
			expect(localStorageMock.getItem("selectedAnimalId")).toBeNull();
		});
	});
});
