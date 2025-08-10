/**
 * Mock System Index
 * Centralized exports for all test mocks
 */

// Stack Auth Mocks
export * from "./stack-auth";
export { default as StackAuthMocks } from "./stack-auth";

// Re-export commonly used test utilities
export {
  StackAuthTestUtils,
  StackAuthPlaywrightHelpers,
  createMockUser,
  createMockSession,
  TEST_USERS,
  stackAuthMocks,
} from "./stack-auth";