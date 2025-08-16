/// <reference types="vitest" />

import type { Mock } from "vitest";
import type { TRPCClientErrorLike } from "@trpc/client";

// Mock window interface for tests
export interface MockWindow extends Window {
  // Auth mock
  mockAuthUser?: {
    id: string;
    email: string;
    name: string;
  };

  // React mock
  React?: {
    createElement: (...args: unknown[]) => unknown;
  };

  // Offline queue methods
  getOfflineQueueData: () => unknown[] | undefined;
  clearOfflineQueue: () => void;

  // API tracking
  apiCallCount: Record<string, number>;

  // TRPC failure mocks
  mockTRPCFailures: Record<string, () => boolean>;

  // Date constructor override
  Date: typeof Date;
}

// Helper type for mocking tRPC mutations
export type MockTRPCMutation<TOutput = unknown, TInput = unknown> = {
  mutateAsync: Mock<(input: TInput) => Promise<TOutput>>;
  trpc: {
    path: string;
  };
  // Add other required properties
  mutate: Mock;
  reset: () => void;
  error: TRPCClientErrorLike<unknown> | null;
  data: TOutput | undefined;
  status: "idle" | "pending" | "error" | "success";
  isIdle: boolean;
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  failureCount: number;
  failureReason: TRPCClientErrorLike<unknown> | null;
  isPaused: boolean;
  variables: TInput | undefined;
  submittedAt: number;
  context: unknown; // Add context property required by tRPC
};

declare global {
  interface Window {
    indexedDB?: IDBFactory;
  }
}
