import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { mockDb } from "./mock-db";

// Cleanup after each test
afterEach(() => {
	cleanup();
});

// Mock database module to prevent neon() from requiring a real connection string
vi.mock("@/db/drizzle", () => ({
	db: mockDb,
	dbPooled: mockDb,
	dbUnpooled: mockDb,
	TIMEOUT_CONFIG: {
		READ: 3000,
		WRITE: 5000,
		MIGRATION: 30000,
		BATCH: 15000,
		HEALTH_CHECK: 2000,
		ANALYTICS: 10000,
	},
	withTimeout: vi.fn((promise: Promise<unknown>) => promise),
	withDatabaseTimeout: vi.fn((operation: () => Promise<unknown>) =>
		operation(),
	),
	createTimeoutSignal: vi.fn(() => new AbortController().signal),
	DatabaseTimeoutError: class extends Error {
		constructor(
			message: string,
			public timeoutMs: number,
			public operation?: string,
		) {
			super(message);
			this.name = "DatabaseTimeoutError";
		}
	},
}));

// Mock Clerk server auth to prevent server-side auth calls during tests
vi.mock("@clerk/nextjs/server", () => ({
	auth: vi.fn().mockResolvedValue({ userId: null, sessionId: null }),
	currentUser: vi.fn().mockResolvedValue(null),
	clerkMiddleware: vi.fn(() => vi.fn()),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter() {
		return {
			push: vi.fn(),
			replace: vi.fn(),
			prefetch: vi.fn(),
			back: vi.fn(),
			pathname: "/",
			query: {},
			asPath: "/",
		};
	},
	useSearchParams() {
		return new URLSearchParams();
	},
	usePathname() {
		return "/";
	},
}));

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
