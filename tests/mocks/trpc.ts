import type { inferProcedureOutput } from "@trpc/server";
import { vi } from "vitest";
import type { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/api/root";

export type RouterOutput = inferProcedureOutput<AppRouter>;

export const createMockTRPCClient = () => {
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
			list: {
				useQuery: vi.fn(),
			},
			getById: {
				useQuery: vi.fn(),
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
			list: {
				useQuery: vi.fn(),
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
			list: {
				useQuery: vi.fn(),
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

	return mockTRPC as unknown as typeof trpc;
};
