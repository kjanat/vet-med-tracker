import "vitest";

import type { createElement } from "react";
import type { Mock } from "vitest";
import type { TRPCClientErrorLike } from "@trpc/client";

// Additional window properties used throughout the test suite
interface MockAuthUser {
  id: string;
  email: string;
  name: string;
  households?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  [key: string]: unknown;
}

interface MockWindowExtensions {
  // Auth mock
  mockAuthUser?: MockAuthUser;

  // React mock
  React?: {
    createElement: typeof createElement;
  };

  // Offline queue methods
  getOfflineQueueData?: () => unknown[] | undefined;
  clearOfflineQueue?: () => void;

  // API tracking
  apiCallCount?: Record<string, number>;

  // TRPC failure mocks
  mockTRPCFailures?: Record<string, () => boolean>;

  // Date constructor override
  Date: typeof Date;

  // Stack Auth visual test data
  __STACK_AUTH_USER__?: Record<string, unknown>;
  __TEST_HOUSEHOLD__?: Record<string, unknown> & {
    animals?: Array<Record<string, unknown>>;
  };
  __TEST_MEDICATIONS__?: Array<Record<string, unknown>>;
  __TEST_REGIMENS__?: Array<Record<string, unknown>>;
  __TEST_INVENTORY__?: Array<Record<string, unknown>>;
  __LOW_STOCK_ALERTS__?: Array<Record<string, unknown>>;
  __TEST_TABLE_DATA__?: Array<Record<string, unknown>>;
  __TEST_NOTIFICATIONS__?: Array<Record<string, unknown>>;
  __TEST_ANIMAL_DETAIL__?: Record<string, unknown>;

  // API client mock used in offline helpers
  api?: {
    admin?: {
      create?: {
        mutate?: (input: Record<string, unknown>) => Promise<unknown>;
      };
    };
    inventory?: {
      updateQuantity?: {
        mutate?: (input: Record<string, unknown>) => Promise<unknown>;
      };
      markAsInUse?: {
        mutate?: (input: Record<string, unknown>) => Promise<unknown>;
      };
    };
  };
}

// Public type that includes both the standard Window and our test helpers
export type MockWindow = Window & MockWindowExtensions;

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
  interface Window extends MockWindowExtensions {
    indexedDB?: IDBFactory;
  }
}
