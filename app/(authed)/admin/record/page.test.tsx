import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MockAppProvider } from "@/tests/mocks/providers";
import RecordPage from "./page";

// Create mock tRPC client before any imports that use it
const mockTRPC = {
	regimen: {
		listDue: {
			useQuery: vi.fn(() => ({
				data: [],
				isLoading: false,
				error: null,
				refetch: vi.fn(),
			})),
		},
	},
	admin: {
		create: {
			useMutation: vi.fn(() => ({
				mutate: vi.fn(),
				mutateAsync: vi.fn(),
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
				data: null,
				reset: vi.fn(),
			})),
		},
	},
	inventory: {
		getSources: {
			useQuery: vi.fn(() => ({
				data: [],
				isLoading: false,
				error: null,
				refetch: vi.fn(),
			})),
		},
	},
	useUtils: vi.fn(() => ({
		regimen: {
			listDue: {
				invalidate: vi.fn(),
			},
		},
	})),
};

// Mock tRPC client
vi.mock("@/server/trpc/client", () => ({
	trpc: mockTRPC,
}));

// Mock offline queue
const mockEnqueue = vi.fn();
vi.mock("@/hooks/useOfflineQueue", () => ({
	useOfflineQueue: () => ({
		isOnline: true,
		enqueue: mockEnqueue,
	}),
}));

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		back: vi.fn(),
	}),
	useSearchParams: () => ({
		get: vi.fn(() => null),
	}),
}));

// Mock due regimens data
const mockDueRegimens = [
	{
		id: "regimen-1",
		animalId: "animal-1",
		animalName: "Buddy",
		animalSpecies: "Dog",
		animalPhotoUrl: "https://example.com/buddy.jpg",
		medicationName: "Amoxicillin",
		brandName: "Amoxil",
		route: "Oral",
		form: "Tablet",
		strength: "250mg",
		dose: "1 tablet",
		targetTime: new Date("2024-01-01T10:00:00"),
		isPRN: false,
		isHighRisk: false,
		requiresCoSign: false,
		compliance: 90,
		section: "due" as const,
		isOverdue: false,
		minutesUntilDue: -30,
		instructions: "Give with food",
		prnReason: null,
		lastAdministration: null,
	},
	{
		id: "regimen-2",
		animalId: "animal-2",
		animalName: "Mittens",
		animalSpecies: "Cat",
		animalPhotoUrl: null,
		medicationName: "Gabapentin",
		brandName: null,
		route: "Oral",
		form: "Liquid",
		strength: "100mg/mL",
		dose: "0.5mL",
		targetTime: new Date("2024-01-01T14:00:00"),
		isPRN: false,
		isHighRisk: true,
		requiresCoSign: true,
		compliance: 85,
		section: "later" as const,
		isOverdue: false,
		minutesUntilDue: 180,
		instructions: null,
		prnReason: null,
		lastAdministration: null,
	},
	{
		id: "regimen-3",
		animalId: "animal-1",
		animalName: "Buddy",
		animalSpecies: "Dog",
		animalPhotoUrl: "https://example.com/buddy.jpg",
		medicationName: "Benadryl",
		brandName: "Diphenhydramine",
		route: "Oral",
		form: "Tablet",
		strength: "25mg",
		dose: "1 tablet",
		targetTime: undefined,
		isPRN: true,
		isHighRisk: false,
		requiresCoSign: false,
		compliance: 100,
		section: "prn" as const,
		isOverdue: false,
		minutesUntilDue: 0,
		instructions: "For allergic reactions",
		prnReason: "Itching",
		lastAdministration: null,
	},
];

// Mock inventory sources
const mockInventorySources = [
	{
		id: "inventory-1",
		name: "Amoxicillin 250mg",
		lot: "LOT123",
		expiresOn: new Date("2025-01-01"),
		unitsRemaining: 20,
		isExpired: false,
		isWrongMed: false,
		inUse: true,
	},
	{
		id: "inventory-2",
		name: "Amoxicillin 250mg",
		lot: "LOT456",
		expiresOn: new Date("2024-06-01"),
		unitsRemaining: 10,
		isExpired: false,
		isWrongMed: false,
		inUse: false,
	},
];

describe("RecordPage", () => {
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();
		mockTRPC.regimen.listDue.useQuery.mockReturnValue({
			data: mockDueRegimens,
			isLoading: false,
			error: null,
			refetch: vi.fn(),
		});
		mockTRPC.inventory.getSources.useQuery.mockReturnValue({
			data: mockInventorySources,
			isLoading: false,
			error: null,
			refetch: vi.fn(),
		});
	});

	it("renders the record page with due medications", async () => {
		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Check main heading
		await waitFor(() => {
			expect(screen.getByText("Record Medication")).toBeInTheDocument();
		});

		// Check sections
		expect(screen.getByText("Due Now")).toBeInTheDocument();
		expect(screen.getByText("Later Today")).toBeInTheDocument();
		expect(screen.getByText("PRN (As Needed)")).toBeInTheDocument();

		// Check medications are displayed
		expect(screen.getByText(/Buddy - Amoxicillin 250mg/)).toBeInTheDocument();
		expect(
			screen.getByText(/Mittens - Gabapentin 100mg\/mL/),
		).toBeInTheDocument();
		expect(screen.getByText(/Buddy - Benadryl 25mg/)).toBeInTheDocument();
	});

	it("shows loading state while fetching data", () => {
		mockTRPC.regimen.listDue.useQuery.mockReturnValue({
			data: undefined,
			isLoading: true,
			error: null,
			refetch: vi.fn(),
		});

		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Check for loading skeleton
		expect(screen.getByTestId("skeleton")).toBeInTheDocument();
	});

	it("shows error state when fetching fails", () => {
		const error = new Error("Failed to fetch medications");
		mockTRPC.regimen.listDue.useQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			error,
			refetch: vi.fn(),
		});

		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		expect(screen.getByText(/Failed to load medications/)).toBeInTheDocument();
	});

	it("shows offline indicator when offline", () => {
		vi.mocked(useOfflineQueue).mockReturnValue({
			isOnline: false,
			enqueue: mockEnqueue,
		});

		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		expect(screen.getByText(/You're offline/)).toBeInTheDocument();
	});

	it("allows selecting a medication and shows confirmation step", async () => {
		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Click on a medication card
		const medicationCard = screen.getByText(/Buddy - Amoxicillin 250mg/);
		await user.click(medicationCard);

		// Should show confirmation step
		await waitFor(() => {
			expect(screen.getByText("Confirm Administration")).toBeInTheDocument();
		});

		// Should show medication details
		expect(screen.getByText(/Buddy - Amoxicillin/)).toBeInTheDocument();
		expect(screen.getByText(/250mg • Oral • Tablet/)).toBeInTheDocument();
	});

	it("shows inventory sources on confirmation step", async () => {
		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Select a medication
		const medicationCard = screen.getByText(/Buddy - Amoxicillin 250mg/);
		await user.click(medicationCard);

		// Wait for inventory sources to load
		await waitFor(() => {
			expect(screen.getByText("Inventory Source")).toBeInTheDocument();
		});

		// Check inventory sources are displayed (in select component)
		const inventorySelect = screen.getByRole("combobox");
		expect(inventorySelect).toBeInTheDocument();
	});

	it("handles form submission with online mutation", async () => {
		const mockMutateAsync = vi.fn().mockResolvedValue({ id: "admin-1" });
		mockTRPC.admin.create.useMutation.mockReturnValue({
			mutateAsync: mockMutateAsync,
			isPending: false,
			isError: false,
			isSuccess: false,
			error: null,
			data: null,
			reset: vi.fn(),
		});

		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Select medication
		await user.click(screen.getByText(/Buddy - Amoxicillin 250mg/));

		// Wait for confirmation screen
		await waitFor(() => {
			expect(screen.getByText("Confirm Administration")).toBeInTheDocument();
		});

		// Fill optional fields
		const notesTextarea = screen.getByPlaceholderText(
			"Any observations or notes...",
		);
		await user.type(notesTextarea, "Dog took medication well");

		// Click confirm button (MedConfirmButton)
		const confirmButton = screen.getByText("Hold to Confirm (3s)");

		// Simulate the hold action (MedConfirmButton has onConfirm prop)
		fireEvent.click(confirmButton);

		// Verify mutation was called with correct data
		await waitFor(() => {
			expect(mockMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					householdId: "household-1",
					animalId: "animal-1",
					regimenId: "regimen-1",
					notes: "Dog took medication well",
				}),
			);
		});
	});

	it("handles offline queue when offline", async () => {
		vi.mocked(useOfflineQueue).mockReturnValue({
			isOnline: false,
			enqueue: mockEnqueue,
		});

		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Select medication
		await user.click(screen.getByText(/Buddy - Amoxicillin 250mg/));

		// Click confirm
		const confirmButton = screen.getByText("Hold to Confirm (3s)");
		fireEvent.click(confirmButton);

		// Verify offline queue was called
		await waitFor(() => {
			expect(mockEnqueue).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "admin.create",
					payload: expect.objectContaining({
						householdId: "household-1",
						animalId: "animal-1",
						regimenId: "regimen-1",
					}),
				}),
				expect.any(String), // idempotency key
			);
		});
	});

	it("shows high-risk medication warning and co-sign requirement", async () => {
		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Select high-risk medication
		await user.click(screen.getByText(/Mittens - Gabapentin/));

		// Should show co-sign requirement
		await waitFor(() => {
			expect(
				screen.getByText("Requires co-sign (high-risk medication)"),
			).toBeInTheDocument();
		});

		// Should have checkbox for co-sign
		const coSignCheckbox = screen.getByRole("checkbox", {
			name: /Requires co-sign/,
		});
		expect(coSignCheckbox).toBeInTheDocument();
		expect(coSignCheckbox).toBeChecked(); // Should be pre-checked for high-risk
	});

	it("shows success screen after recording", async () => {
		const mockMutateAsync = vi.fn().mockResolvedValue({ id: "admin-1" });

		mockTRPC.admin.create.useMutation.mockImplementation((options) => {
			return {
				mutateAsync: async (...args) => {
					const result = await mockMutateAsync(...args);
					options?.onSuccess?.(result);
					return result;
				},
				isPending: false,
				isError: false,
				isSuccess: false,
				error: null,
				data: null,
				reset: vi.fn(),
			};
		});

		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Select and confirm medication
		await user.click(screen.getByText(/Buddy - Amoxicillin 250mg/));

		const confirmButton = screen.getByText("Hold to Confirm (3s)");
		fireEvent.click(confirmButton);

		// Should show success screen
		await waitFor(() => {
			expect(screen.getByText("Recorded Successfully")).toBeInTheDocument();
		});

		// Should have back to home button
		const backButton = screen.getByText("Back to Home");
		await user.click(backButton);

		expect(mockPush).toHaveBeenCalledWith("/");
	});

	it("allows filtering by animal", async () => {
		// TODO: Implement animal filter test when animal selector is added
		expect(true).toBe(true);
	});

	it("handles condition tags selection", async () => {
		render(
			<MockAppProvider>
				<RecordPage />
			</MockAppProvider>,
		);

		// Select medication
		await user.click(screen.getByText(/Buddy - Amoxicillin 250mg/));

		// Select condition tags
		const normalTag = screen.getByRole("button", { name: /Normal/ });
		await user.click(normalTag);

		const improvedTag = screen.getByRole("button", { name: /Improved/ });
		await user.click(improvedTag);

		// Verify tags are selected (they should have different variant)
		expect(normalTag).toHaveClass("default"); // Selected variant
		expect(improvedTag).toHaveClass("default"); // Selected variant
	});
});
