import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { InventoryFormData } from "@/lib/schemas/inventory";
import { useInventoryCalculations, useInventoryForm } from "./useInventoryForm";

// Mock dependencies
vi.mock("@/components/providers/app-provider-consolidated", () => ({
  useApp: () => ({
    selectedHousehold: { id: "household-1", name: "Test Household" },
  }),
}));

vi.mock("@/hooks/shared/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/server/trpc/client", () => ({
  trpc: {
    useUtils: () => ({
      inventory: {
        list: { invalidate: vi.fn() },
      },
    }),
    inventory: {
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({
            id: "inventory-1",
            medication: { name: "Test Medication" },
          }),
          isPending: false,
        }),
      },
      setInUse: {
        useMutation: () => ({
          mutateAsync: vi.fn(),
          isPending: false,
        }),
      },
    },
  },
}));

const mockFormData: InventoryFormData = {
  medicationId: "med-1",
  name: "Test Medication",
  brand: "Test Brand",
  route: "Oral",
  form: "Tablet",
  strength: "25mg",
  concentration: "",
  quantityUnits: 30,
  unitsRemaining: 30,
  lot: "LOT123",
  expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
  storage: "ROOM",
  assignedAnimalId: "animal-1",
  barcode: "123456789",
  setInUse: false,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useInventoryForm", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should open form with default values", () => {
    const { result } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.form.getValues().quantityUnits).toBe(1);
    expect(result.current.form.getValues().unitsRemaining).toBe(1);
    expect(result.current.form.getValues().storage).toBe("ROOM");
  });

  it("should close form and reset state", () => {
    const { result } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeForm();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it("should validate form data before saving", () => {
    const { result } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    const invalidFormData = {
      ...mockFormData,
      medicationId: "", // Required field is empty
    };

    act(() => {
      result.current.saveForm(invalidFormData);
    });

    // Form should still be open due to validation error
    expect(result.current.isOpen).toBe(true);
    expect(result.current.error).toBeTruthy();
  });

  it("should handle successful form submission", async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useInventoryForm({ onSave }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    act(() => {
      result.current.saveForm(mockFormData);
    });

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("inventory-1", mockFormData);
    });
  });

  it("should auto-sync units remaining when quantity changes", () => {
    const { result } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    // Set total units to 30
    act(() => {
      result.current.form.setValue("quantityUnits", 30);
    });

    // Set remaining units higher than total (should be capped)
    act(() => {
      result.current.form.setValue("unitsRemaining", 35);
    });

    expect(result.current.form.getValues().unitsRemaining).toBe(30);
  });

  it("should clear errors", () => {
    const { result } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    // Set an error
    act(() => {
      result.current.saveForm({
        ...mockFormData,
        medicationId: "", // This should cause an error
      });
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearErrorAction();
    });

    expect(result.current.error).toBe(null);
  });

  it("should reset form to default values", () => {
    const { result } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    // Modify form values
    act(() => {
      result.current.form.setValue("name", "Modified Name");
      result.current.form.setValue("quantityUnits", 50);
    });

    expect(result.current.form.getValues().name).toBe("Modified Name");
    expect(result.current.form.getValues().quantityUnits).toBe(50);

    act(() => {
      result.current.resetForm();
    });

    expect(result.current.form.getValues().name).toBe("");
    expect(result.current.form.getValues().quantityUnits).toBe(1);
    expect(result.current.isDirty).toBe(false);
  });

  it("should set dirty state when form changes", () => {
    const { result } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.setDirty(true);
    });

    expect(result.current.isDirty).toBe(true);
  });
});

describe("useInventoryCalculations", () => {
  it("should calculate percentage remaining correctly", () => {
    const { result: formResult } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    const { result: calcResult } = renderHook(
      () => useInventoryCalculations(formResult.current.form),
      {
        wrapper: createWrapper(),
      },
    );

    act(() => {
      formResult.current.form.setValue("quantityUnits", 100);
      formResult.current.form.setValue("unitsRemaining", 25);
    });

    expect(calcResult.current.percentRemaining).toBe(25);
  });

  it("should detect expiring items", () => {
    const { result: formResult } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    const { result: calcResult } = renderHook(
      () => useInventoryCalculations(formResult.current.form),
      {
        wrapper: createWrapper(),
      },
    );

    // Set expiry date to 15 days from now (should be expiring soon)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 15);

    act(() => {
      formResult.current.form.setValue("expiresOn", expiryDate);
    });

    expect(calcResult.current.isExpiringSoon).toBe(true);
  });

  it("should calculate days until expiry", () => {
    const { result: formResult } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    const { result: calcResult } = renderHook(
      () => useInventoryCalculations(formResult.current.form),
      {
        wrapper: createWrapper(),
      },
    );

    // Set expiry date to 10 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 10);

    act(() => {
      formResult.current.form.setValue("expiresOn", expiryDate);
    });

    expect(calcResult.current.daysUntilExpiry).toBe(10);
  });

  it("should detect low quantity", () => {
    const { result: formResult } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    const { result: calcResult } = renderHook(
      () => useInventoryCalculations(formResult.current.form),
      {
        wrapper: createWrapper(),
      },
    );

    act(() => {
      formResult.current.form.setValue("quantityUnits", 100);
      formResult.current.form.setValue("unitsRemaining", 10); // 10% remaining
    });

    expect(calcResult.current.isQuantityLow).toBe(true);
  });

  it("should get storage description", () => {
    const { result: formResult } = renderHook(() => useInventoryForm(), {
      wrapper: createWrapper(),
    });

    const { result: calcResult } = renderHook(
      () => useInventoryCalculations(formResult.current.form),
      {
        wrapper: createWrapper(),
      },
    );

    act(() => {
      formResult.current.form.setValue("storage", "FRIDGE");
    });

    expect(calcResult.current.storageDescription).toBe("Store at 2-8°C");
  });
});
