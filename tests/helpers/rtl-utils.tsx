/**
 * React Testing Library utilities and custom render functions
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import type { ReactElement } from "react";
import { TRPCProvider } from "@/lib/trpc/client";
import { trpc } from "@/server/trpc/client";
import { testConfig } from "./test-fixtures";

// Mock providers for isolated testing
const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <div data-theme="light">{children}</div>;

interface MockAppProviderProps {
  children: React.ReactNode;
  household?: any;
  selectedAnimal?: any;
}

const MockAppProvider: React.FC<MockAppProviderProps> = ({
  children,
  household,
  selectedAnimal,
}) => {
  const contextValue = {
    household: household || {
      id: testConfig.mockSession.access.householdId,
      name: "Test Household",
    },
    selectedAnimal: selectedAnimal || null,
    setSelectedAnimal: vi.fn(),
    animals: [],
    isLoading: false,
  };

  return (
    <div
      data-testid="mock-app-provider"
      data-context={JSON.stringify(contextValue)}
    >
      {children}
    </div>
  );
};

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // TanStack Query options
  queryClient?: QueryClient;

  // tRPC mocking options
  trpcMocks?: any;

  // App context options
  household?: any;
  selectedAnimal?: any;

  // Skip providers for unit tests
  skipProviders?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {},
) {
  const {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    trpcMocks,
    household,
    selectedAnimal,
    skipProviders = false,
    ...renderOptions
  } = options;

  // For unit tests that don't need providers
  if (skipProviders) {
    return render(ui, renderOptions);
  }

  const trpcClient = trpc.createClient({
    links: [
      // Mock implementation would go here
      // For now, we'll just pass through
    ],
  });

  const AllProviders: React.FC<{ children: React.ReactNode }> = ({
    children,
  }) => (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider client={trpcClient} queryClient={queryClient}>
        <MockThemeProvider>
          <MockAppProvider
            household={household}
            selectedAnimal={selectedAnimal}
          >
            {children}
          </MockAppProvider>
        </MockThemeProvider>
      </TRPCProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: AllProviders, ...renderOptions });
}

// Component testing utilities
export const waitForLoadingToFinish = async () => {
  const { waitForElementToBeRemoved } = await import("@testing-library/react");

  await waitForElementToBeRemoved(
    () => document.querySelector('[data-testid="loading"]'),
    { timeout: 3000 },
  );
};

export const findByTestId = async (testId: string) => {
  const { screen } = await import("@testing-library/react");
  return screen.findByTestId(testId);
};

export const getByTestId = async (testId: string) => {
  const { screen } = await import("@testing-library/react");
  return screen.getByTestId(testId);
};

// Form testing helpers
export const fillFormField = async (fieldLabel: string, value: string) => {
  const { screen } = await import("@testing-library/react");
  const { default: userEvent } = await import("@testing-library/user-event");

  const user = userEvent.setup();
  const field = screen.getByLabelText(fieldLabel);

  await user.clear(field);
  await user.type(field, value);

  return field;
};

export const selectOption = async (selectLabel: string, optionText: string) => {
  const { screen } = await import("@testing-library/react");
  const { default: userEvent } = await import("@testing-library/user-event");

  const user = userEvent.setup();
  const select = screen.getByLabelText(selectLabel);

  await user.click(select);
  await user.click(screen.getByText(optionText));

  return select;
};

export const clickButton = async (buttonText: string) => {
  const { screen } = await import("@testing-library/react");
  const { default: userEvent } = await import("@testing-library/user-event");

  const user = userEvent.setup();
  const button = screen.getByRole("button", { name: buttonText });

  await user.click(button);

  return button;
};

// File upload testing helper
export const uploadFile = async (inputTestId: string, file: File) => {
  const { default: userEvent } = await import("@testing-library/user-event");

  const user = userEvent.setup();
  const input = await getByTestId(inputTestId);

  await user.upload(input, file);

  return input;
};

// Dialog/Modal testing helpers
export const expectDialogToBeOpen = async (dialogTitle: string) => {
  const { screen, waitFor } = await import("@testing-library/react");

  await waitFor(() => {
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(dialogTitle)).toBeInTheDocument();
  });
};

export const expectDialogToBeClosed = async () => {
  const { screen, waitFor } = await import("@testing-library/react");

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
};

// Toast/Notification testing helpers
export const expectSuccessToast = async (message?: string) => {
  const { screen, waitFor } = await import("@testing-library/react");

  await waitFor(() => {
    const toast = screen.getByRole("status");
    expect(toast).toBeInTheDocument();

    if (message) {
      expect(toast).toHaveTextContent(message);
    }
  });
};

export const expectErrorToast = async (message?: string) => {
  const { screen, waitFor } = await import("@testing-library/react");

  await waitFor(() => {
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();

    if (message) {
      expect(alert).toHaveTextContent(message);
    }
  });
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe } = await import("jest-axe");

  const results = await axe(container);
  expect(results).toHaveNoViolations();

  return results;
};

// Mobile viewport testing
export const setMobileViewport = () => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 375,
  });

  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: 667,
  });

  window.dispatchEvent(new Event("resize"));
};

export const setDesktopViewport = () => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: 1024,
  });

  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: 768,
  });

  window.dispatchEvent(new Event("resize"));
};

// Performance testing helpers
export const measureRenderTime = (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();

  return end - start;
};

// Snapshot testing helpers
export const expectMatchesSnapshot = (
  component: ReactElement,
  snapshotName?: string,
) => {
  const { render } = require("@testing-library/react");
  const { container } = render(component);

  if (snapshotName) {
    expect(container.firstChild).toMatchSnapshot(snapshotName);
  } else {
    expect(container.firstChild).toMatchSnapshot();
  }
};

// Re-export common testing library functions
export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
