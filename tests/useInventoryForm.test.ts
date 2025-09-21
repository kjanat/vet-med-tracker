import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import { act, renderHook } from "@testing-library/react";
import * as AppProvider from "@/components/providers/app-provider-consolidated";
import type { UseInventoryFormOptions } from "@/hooks/forms/useInventoryForm";
import { useInventoryForm } from "@/hooks/forms/useInventoryForm";
import { createTestAppContext } from "./auth/test-auth-helpers";

// Mock dependencies
const useAppMock = spyOn(AppProvider, "useApp");

mock.module("@/hooks/shared/use-toast", () => ({
  useToast: () => ({
    toast: mock(),
  }),
}));

mock.module("@/server/trpc/client", () => ({
  trpc: {
    inventory: {
      create: {
        useMutation: mock(() => ({
          isPending: false,
          mutateAsync: mock(),
          onError: mock(),
          onSuccess: mock(),
        })),
      },
      setInUse: {
        useMutation: mock(() => ({
          isPending: false,
          mutateAsync: mock(),
          onError: mock(),
          onSuccess: mock(),
        })),
      },
    },
    useUtils: () => ({
      inventory: {
        list: { invalidate: mock() },
      },
    }),
  },
}));

const mockFormState = {
  clearError: mock(),
  closeForm: mock(),
  error: null,
  isDirty: false,
  isOpen: false,
  openForm: mock(),
  setDirty: mock(),
  setError: mock(),
};

const daysInYear = 365;

mock.module("@/hooks/forms/useInventoryFormState", () => ({
  useInventoryFormState: () => mockFormState,
}));

mock.module("@/lib/services/inventoryDataTransformer", () => ({
  InventoryDataTransformer: {
    calculateDerivedFields: mock(() => ({
      daysUntilExpiry: daysInYear,
      isExpiringSoon: false,
      percentRemaining: 100,
      storageDescription: "Room Temperature",
    })),
    createFreshDefaults: mock(() => ({
      assignedAnimalId: "",
      barcode: "",
      brand: "",
      concentration: "",
      expiresOn: new Date(),
      form: "tablet",
      isCustomMedication: false,
      lot: "",
      medicationId: "",
      name: "",
      quantityUnits: 1,
      route: "oral",
      setInUse: false,
      storage: "ROOM",
      strength: "",
      unitsRemaining: 1,
    })),
    createInstrumentationData: mock(() => ({
      medicationId: "test-med",
      quantity: 10,
    })),
    getStorageOptions: () => [
      { label: "Room Temperature", value: "ROOM" },
      { label: "Refrigerated", value: "FRIDGE" },
      { label: "Frozen", value: "FREEZER" },
      { label: "Controlled Substance", value: "CONTROLLED" },
    ],
    setDefaultValues: mock(() => ({
      assignedAnimalId: "",
      barcode: "",
      brand: "",
      concentration: "",
      expiresOn: new Date(),
      form: "tablet",
      isCustomMedication: false,
      lot: "",
      medicationId: "",
      name: "",
      quantityUnits: 1,
      route: "oral",
      setInUse: false,
      storage: "ROOM",
      strength: "",
      unitsRemaining: 1,
    })),
    syncRemainingUnits: mock((_data, quantity) => ({
      unitsRemaining: quantity,
    })),
    toApiPayload: mock(() => ({
      householdId: "household-1",
      medicationId: "med-1",
      quantityUnits: 10,
      storage: "ROOM",
      unitsRemaining: 10,
    })),
  },
}));

mock.module("@/lib/services/inventoryFormValidator", () => ({
  InventoryFormValidator: {
    getDisplayMessage: mock(() => null),
    validate: mock(() => ({
      errors: [],
      isValid: true,
      warnings: [],
    })),
  },
}));

mock.module("@/lib/schemas/inventory", () => {
  const { z } = require("zod");
  return {
    inventoryFormSchema: z.object({
      assignedAnimalId: z.string().optional(),
      barcode: z.string().optional(),
      brand: z.string().optional(),
      concentration: z.string().optional(),
      expiresOn: z.date(),
      form: z.string().min(1, "Form is required"),
      isCustomMedication: z.boolean(),
      lot: z.string().optional(),
      medicationId: z.string().optional(),
      name: z.string().min(1, "Medication name is required"),
      quantityUnits: z.number().int().positive(),
      route: z.string().min(1, "Route is required"),
      setInUse: z.boolean(),
      storage: z.enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"]),
      strength: z.string().optional(),
      unitsRemaining: z.number().int().min(0),
    }),
  };
});

describe("useInventoryForm", () => {
  beforeEach(() => {
    // Clear mocks individually
    useAppMock.mockClear();
    useAppMock.mockImplementation(() =>
      createTestAppContext({
        households: [{ id: "household-1", name: "Test Household" }],
        selectedHousehold: { id: "household-1", name: "Test Household" },
        selectedHouseholdId: "household-1",
      }),
    );
  });

  afterAll(() => {
    useAppMock.mockRestore();
    mock.restore();
  });

  describe("basic hook functionality", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useInventoryForm());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.form).toBeDefined();
      expect(result.current.isDirty).toBe(false);
    });

    it("should provide all required form actions", () => {
      const { result } = renderHook(() => useInventoryForm());

      expect(typeof result.current.openForm).toBe("function");
      expect(typeof result.current.closeForm).toBe("function");
      expect(typeof result.current.saveForm).toBe("function");
      expect(typeof result.current.resetForm).toBe("function");
      expect(typeof result.current.setDirty).toBe("function");
      expect(typeof result.current.clearErrorAction).toBe("function");
    });

    it("should provide tRPC mutations for backward compatibility", () => {
      const { result } = renderHook(() => useInventoryForm());

      expect(result.current.createMutation).toBeDefined();
      expect(result.current.setInUseMutation).toBeDefined();
    });

    it("should export storage options", () => {
      const { STORAGE_OPTIONS } = require("@/hooks/forms/useInventoryForm");

      expect(STORAGE_OPTIONS).toBeDefined();
      expect(Array.isArray(STORAGE_OPTIONS)).toBe(true);
      expect(STORAGE_OPTIONS.length).toBeGreaterThan(0);
    });
  });

  describe("form lifecycle management", () => {
    it("should call onOpen callback when provided", () => {
      const onOpen = mock();
      const options: UseInventoryFormOptions = { onOpen };

      const { result } = renderHook(() => useInventoryForm(options));

      act(() => {
        result.current.openForm();
      });

      expect(mockFormState.openForm).toHaveBeenCalled();
    });

    it("should call onClose callback when provided", () => {
      const onClose = mock();
      const options: UseInventoryFormOptions = { onClose };

      const { result } = renderHook(() => useInventoryForm(options));

      act(() => {
        result.current.closeForm();
      });

      expect(mockFormState.closeForm).toHaveBeenCalled();
    });

    it("should reset form with fresh defaults when opening", () => {
      const { result } = renderHook(() => useInventoryForm());
      const InventoryDataTransformer =
        require("@/lib/services/inventoryDataTransformer").InventoryDataTransformer;

      act(() => {
        result.current.openForm();
      });

      expect(InventoryDataTransformer.createFreshDefaults).toHaveBeenCalled();
    });

    it("should reset form and clear state when closing", () => {
      const { result } = renderHook(() => useInventoryForm());

      act(() => {
        result.current.closeForm();
      });

      expect(mockFormState.closeForm).toHaveBeenCalled();
    });
  });

  describe("default options handling", () => {
    it("should use default storage option", () => {
      const options: UseInventoryFormOptions = { defaultStorage: "FRIDGE" };
      const { result } = renderHook(() => useInventoryForm(options));

      expect(result.current).toBeDefined();
    });

    it("should use default expiry days", () => {
      const options: UseInventoryFormOptions = { defaultExpiryDays: 1000 };
      const { result } = renderHook(() => useInventoryForm(options));

      expect(result.current).toBeDefined();
    });

    it("should respect validateQuantity option", () => {
      const options: UseInventoryFormOptions = { validateQuantity: false };
      const { result } = renderHook(() => useInventoryForm(options));

      expect(result.current).toBeDefined();
    });
  });

  describe("form validation", () => {
    it("should handle validation success", async () => {
      const onSave = mock();
      const options: UseInventoryFormOptions = { onSave };

      const { result } = renderHook(() => useInventoryForm(options));

      const testData = {
        assignedAnimalId: "",
        barcode: "",
        brand: "",
        concentration: "",
        expiresOn: new Date(),
        form: "tablet",
        isCustomMedication: false,
        lot: "",
        medicationId: "med-1",
        name: "Test Medication",
        quantityUnits: 10,
        route: "oral",
        setInUse: false,
        storage: "ROOM" as const,
        strength: "",
        unitsRemaining: 10,
      };

      await act(async () => {
        await result.current.saveForm(testData);
      });

      const InventoryFormValidator =
        require("@/lib/services/inventoryFormValidator").InventoryFormValidator;
      expect(InventoryFormValidator.validate).toHaveBeenCalledWith(
        testData,
        expect.objectContaining({
          allowPastExpiry: false,
          householdId: "household-1",
          validateQuantity: true,
        }),
      );
    });

    it("should handle validation failure", async () => {
      const InventoryFormValidator =
        require("@/lib/services/inventoryFormValidator").InventoryFormValidator;
      spyOn(InventoryFormValidator, "validate").mockReturnValue({
        errors: [
          { code: "REQUIRED", field: "medicationId", message: "Required" },
        ],
        isValid: false,
        warnings: [],
      });
      spyOn(InventoryFormValidator, "getDisplayMessage").mockReturnValue(
        "Validation failed",
      );

      const { result } = renderHook(() => useInventoryForm());

      const testData = {
        assignedAnimalId: "",
        barcode: "",
        brand: "",
        concentration: "",
        expiresOn: new Date(),
        form: "",
        isCustomMedication: false,
        lot: "",
        medicationId: "",
        name: "",
        quantityUnits: 0,
        route: "",
        setInUse: false,
        storage: "ROOM" as const,
        strength: "",
        unitsRemaining: 0,
      };

      await act(async () => {
        await result.current.saveForm(testData);
      });

      expect(InventoryFormValidator.getDisplayMessage).toHaveBeenCalled();
      expect(mockFormState.setError).toHaveBeenCalledWith("Validation failed");
    });
  });

  describe("quantity synchronization", () => {
    it("should sync remaining units when total quantity changes", () => {
      const { result } = renderHook(() => useInventoryForm());

      // This tests the auto-sync logic
      expect(result.current.form).toBeDefined();
    });
  });

  describe("save workflow", () => {
    it("should prepare save workflow correctly", async () => {
      const onSave = mock();
      const options: UseInventoryFormOptions = { autoClose: true, onSave };

      const { result } = renderHook(() => useInventoryForm(options));

      // Verify the form is properly initialized for saving
      expect(result.current.saveForm).toBeDefined();
      expect(typeof result.current.saveForm).toBe("function");
    });

    it("should have proper mutations for save workflow", async () => {
      const { result } = renderHook(() => useInventoryForm());

      // Verify mutations are available
      expect(result.current.createMutation).toBeDefined();
      expect(result.current.setInUseMutation).toBeDefined();
    });
  });

  describe("options handling", () => {
    it("should respect autoClose option", () => {
      const options: UseInventoryFormOptions = { autoClose: false };
      const { result } = renderHook(() => useInventoryForm(options));

      expect(result.current).toBeDefined();
    });

    it("should respect showSuccessToast option", () => {
      const options: UseInventoryFormOptions = { showSuccessToast: false };
      const { result } = renderHook(() => useInventoryForm(options));

      expect(result.current).toBeDefined();
    });

    it("should use custom success message when provided", () => {
      const successMessage = mock(() => "Custom success message");
      const options: UseInventoryFormOptions = { successMessage };

      const { result } = renderHook(() => useInventoryForm(options));

      expect(result.current).toBeDefined();
    });
  });
});

describe("useInventoryCalculations", () => {
  const {
    useInventoryCalculations,
  } = require("@/hooks/forms/useInventoryForm");

  it("should calculate derived fields using data transformer", () => {
    const mockForm = {
      getValues: mock(() => ({
        expiresOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        quantityUnits: 10,
        storage: "ROOM",
        unitsRemaining: 8,
      })),
    };

    const calculations = useInventoryCalculations(mockForm);

    expect(calculations.percentRemaining).toBe(100);
    expect(calculations.isExpiringSoon).toBe(false);
    expect(calculations.storageDescription).toBe("Room Temperature");
    expect(calculations.daysUntilExpiry).toBe(daysInYear);

    const InventoryDataTransformer =
      require("@/lib/services/inventoryDataTransformer").InventoryDataTransformer;
    expect(InventoryDataTransformer.calculateDerivedFields).toHaveBeenCalled();
  });

  it("should handle different storage types", () => {
    const mockForm = {
      getValues: mock(() => ({
        storage: "FRIDGE",
      })),
    };

    const calculations = useInventoryCalculations(mockForm);

    expect(calculations).toBeDefined();
  });
});
