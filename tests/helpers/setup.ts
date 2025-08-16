import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

// jest-axe is optional in test environment
let toHaveNoViolations: any;
try {
  const jestAxe = require("jest-axe");
  toHaveNoViolations = jestAxe.toHaveNoViolations;
} catch {
  // jest-axe not available, use no-op
  toHaveNoViolations = {};
}

import { StackAuthTestUtils } from "../mocks/stack-auth";

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Cleanup after each test
afterEach(() => {
  cleanup();
  // Reset Stack Auth mocks after each test
  StackAuthTestUtils.reset();
});

// Setup Stack Auth mocks before each test
beforeEach(() => {
  StackAuthTestUtils.initialize();
});

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

// Mock Stack Auth module
vi.mock("@stackframe/stack", () => {
  const { stackAuthMocks } = require("../mocks/stack-auth");
  return stackAuthMocks["@stackframe/stack"];
});

// Mock the Stack server app
vi.mock("../../stack", () => ({
  stackServerApp: StackAuthTestUtils.getMockStackServerApp(),
}));

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
