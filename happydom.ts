// noinspection AssignmentToFunctionParameterJS

import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Register happy-dom globals
GlobalRegistrator.register();

// Note: @testing-library/jest-dom is not imported here to avoid Node.DOCUMENT_POSITION issues
// Import it directly in tests that need it instead

type MockFn = ((...args: unknown[]) => unknown) & {
  mockClear: () => MockFn;
  mockImplementation: (newImpl: (...args: unknown[]) => unknown) => MockFn;
};

type JestCompat = {
  useFakeTimers?: () => void;
  useRealTimers?: () => void;
  setSystemTime?: (date?: Date | number) => void;
  advanceTimersByTime?: (ms: number) => void;
  runAllTimers?: () => void;
  now?: () => number;
  isMockFunction?: (fn?: unknown) => boolean;
  fn?: (impl?: (...args: unknown[]) => unknown) => MockFn;
};

// Extend globalThis type for Jest compatibility
declare global {
  // noinspection ES6ConvertVarToLetConst
  var jest: JestCompat | undefined;
  // noinspection ES6ConvertVarToLetConst
  var __TEST_TIMEZONE__: string | undefined;
}

if (typeof globalThis.__TEST_TIMEZONE__ !== "string") {
  globalThis.__TEST_TIMEZONE__ = "Europe/Amsterdam";
}

const ensureJestGlobal = (): JestCompat => {
  if (!globalThis.jest) {
    globalThis.jest = {};
  }
  return globalThis.jest;
};

const ensureTimerMethods = (jestObject: JestCompat) => {
  if (!jestObject.useFakeTimers) {
    jestObject.useFakeTimers = () => {};
  }
  if (!jestObject.useRealTimers) {
    jestObject.useRealTimers = () => {};
  }
  if (!jestObject.setSystemTime) {
    jestObject.setSystemTime = () => {};
  }
  if (!jestObject.advanceTimersByTime) {
    jestObject.advanceTimersByTime = () => {};
  }
  if (!jestObject.runAllTimers) {
    jestObject.runAllTimers = () => {};
  }
  if (!jestObject.now) {
    jestObject.now = () => Date.now();
  }
  if (!jestObject.fn) {
    jestObject.fn = createMockFn;
  }
  if (!jestObject.isMockFunction) {
    jestObject.isMockFunction = isMockFunction;
  }
};

const createMockFn = (impl?: (...args: unknown[]) => unknown): MockFn => {
  const mockFn: MockFn = ((...args: unknown[]) => impl?.(...args)) as MockFn;
  mockFn.mockClear = () => mockFn;
  mockFn.mockImplementation = (newImpl: (...args: unknown[]) => unknown) => {
    impl = newImpl;
    return mockFn;
  };
  return mockFn;
};

const isMockFunction = (fn?: unknown): boolean =>
  typeof fn === "function" &&
  Boolean(
    (fn as { mockClear?: unknown; mock?: unknown }).mockClear ||
      (fn as { mock?: unknown }).mock,
  );

// Add Jest timer compatibility for React Testing Library
// This is required because @testing-library/dom internally checks for jest.advanceTimersByTime
const jestGlobal = ensureJestGlobal();
ensureTimerMethods(jestGlobal);

// Ensure the jest object has the timer methods React Testing Library expects
Object.assign(jestGlobal, {
  advanceTimersByTime:
    jestGlobal.advanceTimersByTime ||
    ((ms: number) => {
      // Critical: This prevents React Testing Library from crashing
      // Since Bun doesn't support timer mocking yet, this is a no-op
      // React Testing Library will fall back to real timers after this
      console.debug(
        `[Timer Compat] advanceTimersByTime(${ms}ms) - no-op in Bun`,
      );
    }),
  fn:
    jestGlobal.fn ||
    ((impl?: (...args: unknown[]) => unknown) => createMockFn(impl)),
  isMockFunction:
    jestGlobal.isMockFunction || ((fn?: unknown) => isMockFunction(fn)),
  now: jestGlobal.now || (() => Date.now()),
  runAllTimers:
    jestGlobal.runAllTimers ||
    (() => {
      // Jest's runAllTimers equivalent - no-op in Bun
      console.debug("[Timer Compat] runAllTimers() - no-op in Bun");
    }),
  setSystemTime:
    jestGlobal.setSystemTime ||
    ((_date?: Date | number) => {
      // Bun's setSystemTime compatibility
    }),
  useFakeTimers:
    jestGlobal.useFakeTimers ||
    (() => {
      // Bun's timer mocking - placeholder for now
    }),
  useRealTimers:
    jestGlobal.useRealTimers ||
    (() => {
      // Reset to real timers - placeholder for now
    }),
});

// Ensure globalThis.jest always points to our compat object even if reassigned
Object.defineProperty(globalThis, "jest", {
  configurable: true,
  get: () => {
    ensureTimerMethods(jestGlobal);
    return jestGlobal;
  },
  set: (value) => {
    if (value && typeof value === "object") {
      Object.assign(jestGlobal, value as Record<string, unknown>);
      ensureTimerMethods(jestGlobal);
    }
  },
});

// Enhance Bun's expect to be more Jest-compatible for @testing-library/jest-dom
if (typeof globalThis.expect !== "undefined") {
  const originalExpected = globalThis.expect;

  // Add Jest-specific properties that @testing-library/jest-dom expects
  if (!originalExpected.getState) {
    originalExpected.getState = () => ({
      assertionCalls: 0,
      currentTestName: "",
      expand: true,
      expectedAssertionsNumber: null,
      isExpectingAssertions: false,
      suppressedErrors: [],
      testPath: "",
    });
  }

  if (!originalExpected.setState) {
    originalExpected.setState = () => {};
  }

  // Mock asymmetric matchers that jest-dom might need
  if (!originalExpected.anything) {
    originalExpected.anything = () => ({ asymmetricMatch: () => true });
  }

  if (!originalExpected.stringMatching) {
    originalExpected.stringMatching = (pattern: string | RegExp) => ({
      asymmetricMatch: (actual: string) => {
        if (typeof pattern === "string") {
          return actual.includes(pattern);
        }
        return pattern.test(actual);
      },
    });
  }
}
