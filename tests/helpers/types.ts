// Type definitions for test helpers
import type React from "react";

export interface QueuedMutationData {
	id: string;
	type: "admin.create" | "inventory.update" | "inventory.markAsInUse";
	payload: unknown;
	timestamp: number;
	retries: number;
	maxRetries: number;
	householdId: string;
	userId: string;
	lastError?: string;
}

export interface MockInput {
	id: string;
	[key: string]: unknown;
}

export interface MockReactProps {
	[key: string]: unknown;
	children?: React.ReactNode;
	name?: string;
	"data-testid"?: string;
}

export interface MockWindow extends Window {
	indexedDB: IDBFactory;
	getOfflineQueueData: () => QueuedMutationData[];
	clearOfflineQueue: () => void;
	apiCallCount: Record<string, number>;
	mockTRPCFailures: Record<string, () => boolean>;
	mockAuthUser?: {
		id: string;
		email: string;
		name: string;
		households: Array<{
			id: string;
			name: string;
			role: string;
		}>;
	};
	api?: {
		admin: {
			create: {
				mutate: (input: unknown) => Promise<unknown>;
			};
		};
		inventory: {
			updateQuantity: {
				mutate: (input: unknown) => Promise<unknown>;
			};
			markAsInUse: {
				mutate: (input: unknown) => Promise<unknown>;
			};
		};
	};
	React?: {
		createElement: (...args: unknown[]) => unknown;
	};
	Date: typeof Date;
	Intl: typeof Intl;
}
