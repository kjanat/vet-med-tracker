import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import React, { type ReactElement } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/api/root";

// Create a test tRPC client
export const trpc = createTRPCReact<AppRouter>();

// Create providers wrapper
interface AllTheProvidersProps {
	children: React.ReactNode;
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
	const [queryClient] = React.useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						retry: false,
						staleTime: 0,
					},
				},
			}),
	);

	const [trpcClient] = React.useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: "http://localhost:3000/api/trpc",
					transformer: superjson,
				}),
			],
		}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
}

// Custom render function
const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };

// Test data factories
export const createMockUser = (overrides = {}) => ({
	id: "user-123",
	email: "test@example.com",
	name: "Test User",
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

export const createMockHousehold = (overrides = {}) => ({
	id: "household-123",
	name: "Test Household",
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

export const createMockAnimal = (overrides = {}) => ({
	id: "animal-123",
	name: "Buddy",
	species: "dog",
	breed: "Golden Retriever",
	dateOfBirth: new Date("2020-01-01"),
	householdId: "household-123",
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

export const createMockRegimen = (overrides = {}) => ({
	id: "regimen-123",
	animalId: "animal-123",
	medicationId: "med-123",
	dosage: "250mg",
	frequency: "BID",
	startDate: new Date(),
	endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

export const createMockInventoryItem = (overrides = {}) => ({
	id: "inventory-123",
	householdId: "household-123",
	medicationId: "med-123",
	quantity: 30,
	unit: "tablets",
	expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
	assignedToAnimalId: null,
	isInUse: false,
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});
