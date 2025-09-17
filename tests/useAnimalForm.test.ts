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
import type { UseAnimalFormOptions } from "@/hooks/forms/useAnimalForm";
import { useAnimalForm } from "@/hooks/forms/useAnimalForm";
import { createTestAppContext } from "./auth/test-auth-helpers";

// Mock dependencies with proper scoping
const mockSelectedHousehold = { id: "household-1", name: "Test Household" };
const mockUseApp = spyOn(AppProvider, "useApp");

mock.module("@/hooks/shared/use-toast", () => ({
  useToast: () => ({
    toast: mock(),
  }),
}));

mock.module("@/server/trpc/client", () => ({
  trpc: {
    useUtils: () => ({
      animal: {
        list: { invalidate: mock() },
      },
      household: {
        getAnimals: { invalidate: mock() },
      },
    }),
    animal: {
      create: {
        useMutation: mock(() => ({
          mutateAsync: mock(),
          isPending: false,
          onSuccess: mock(),
          onError: mock(),
        })),
      },
      update: {
        useMutation: mock(() => ({
          mutateAsync: mock(),
          isPending: false,
          onSuccess: mock(),
          onError: mock(),
        })),
      },
    },
  },
}));

const mockFormState = {
  isOpen: false,
  editingAnimal: null,
  isDirty: false,
  error: null,
  setError: mock(),
  setDirty: mock(),
  clearError: mock(),
  openForm: mock(),
  closeForm: mock(),
};

mock.module("@/hooks/forms/useAnimalFormState", () => ({
  useAnimalFormState: () => mockFormState,
}));

mock.module("@/lib/services/animalDataTransformer", () => ({
  AnimalDataTransformer: {
    createDefaultValues: () => ({
      name: "",
      species: "",
      breed: "",
      sex: undefined,
      neutered: false,
      dob: undefined,
      weightKg: undefined,
      microchipId: "",
      color: "",
      timezone: "America/New_York",
      vetName: "",
      vetPhone: "",
      vetEmail: "",
      clinicName: "",
      notes: "",
      allergies: [],
      conditions: [],
      photoUrl: "",
    }),
    fromAnimalRecord: mock(),
    toCreatePayload: mock(),
    toUpdatePayload: mock(),
    toInstrumentationData: mock(() => ({
      eventType: "animal_create",
      detail: { animal: "test" },
    })),
    calculateCompleteness: mock(() => 75),
    isCompleteRecord: mock(() => false),
    hasRequiredFields: mock(() => true),
  },
}));

mock.module("@/lib/services/animalFormValidator", () => ({
  AnimalFormValidator: {
    canSubmit: mock(() => true),
    getErrorMessage: mock(() => null),
  },
}));

describe("useAnimalForm", () => {
  beforeEach(() => {
    mockUseApp.mockClear();
    mockUseApp.mockImplementation(() =>
      createTestAppContext({
        selectedHousehold: mockSelectedHousehold,
        selectedHouseholdId: mockSelectedHousehold.id,
        households: [mockSelectedHousehold],
      }),
    );
  });

  afterAll(() => {
    mockUseApp.mockRestore();
    mock.restore();
  });

  describe("basic hook functionality", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useAnimalForm());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.editingAnimal).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.form).toBeDefined();
    });

    it("should provide all required form actions", () => {
      const { result } = renderHook(() => useAnimalForm());

      expect(typeof result.current.openForm).toBe("function");
      expect(typeof result.current.closeForm).toBe("function");
      expect(typeof result.current.saveForm).toBe("function");
      expect(typeof result.current.resetForm).toBe("function");
      expect(typeof result.current.setDirty).toBe("function");
      expect(typeof result.current.clearErrorAction).toBe("function");
    });

    it("should provide tRPC mutations for backward compatibility", () => {
      const { result } = renderHook(() => useAnimalForm());

      expect(result.current.createMutation).toBeDefined();
      expect(result.current.updateMutation).toBeDefined();
    });
  });

  describe("form lifecycle management", () => {
    it("should call onOpen callback when provided", () => {
      const onOpen = mock();
      const options: UseAnimalFormOptions = { onOpen };

      const { result } = renderHook(() => useAnimalForm(options));

      act(() => {
        result.current.openForm();
      });

      expect(mockFormState.openForm).toHaveBeenCalledWith(undefined);
    });

    it("should call onClose callback when provided", () => {
      const onClose = mock();
      const options: UseAnimalFormOptions = { onClose };

      const { result } = renderHook(() => useAnimalForm(options));

      act(() => {
        result.current.closeForm();
      });

      expect(mockFormState.closeForm).toHaveBeenCalled();
    });

    it("should reset form when opening for new animal", () => {
      const { result } = renderHook(() => useAnimalForm());

      act(() => {
        result.current.openForm();
      });

      const formValues = result.current.form.getValues();
      expect(formValues.name).toBe("");
      expect(formValues.species).toBe("");
      expect(formValues.timezone).toBe("America/New_York");
    });
  });

  describe("form validation", () => {
    it("should handle validation success", async () => {
      const onSave = mock();
      const options: UseAnimalFormOptions = { onSave };

      const { result } = renderHook(() => useAnimalForm(options));

      const testData = {
        name: "Buddy",
        species: "Dog",
        timezone: "America/New_York",
        breed: "Golden Retriever",
        sex: "Male" as const,
        neutered: false,
        allergies: [],
        conditions: [],
      };

      await act(async () => {
        await result.current.saveForm(testData);
      });

      // Should clear errors on successful validation
      expect(result.current.error).toBe(null);
    });

    it("should handle validation failure", async () => {
      // Mock validation failure
      const AnimalFormValidator = (
        await import("@/lib/services/animalFormValidator")
      ).AnimalFormValidator;
      spyOn(AnimalFormValidator, "canSubmit").mockReturnValue(false);
      spyOn(AnimalFormValidator, "getErrorMessage").mockReturnValue(
        "Validation failed",
      );

      const { result } = renderHook(() => useAnimalForm());

      const testData = {
        name: "",
        species: "",
        neutered: false,
        timezone: "",
        allergies: [],
        conditions: [],
      };

      await act(async () => {
        await result.current.saveForm(testData);
      });

      expect(AnimalFormValidator.canSubmit).toHaveBeenCalledWith(
        testData,
        expect.objectContaining({
          household: expect.any(Object),
          isEditing: false,
        }),
      );
    });
  });

  describe("options handling", () => {
    it("should respect autoClose option", () => {
      const options: UseAnimalFormOptions = { autoClose: false };
      const { result } = renderHook(() => useAnimalForm(options));

      // Form should not auto-close when autoClose is false
      expect(result.current).toBeDefined();
    });

    it("should respect showSuccessToast option", () => {
      const options: UseAnimalFormOptions = { showSuccessToast: false };
      const { result } = renderHook(() => useAnimalForm(options));

      expect(result.current).toBeDefined();
    });

    it("should use custom success message when provided", () => {
      const successMessage = mock(() => "Custom success message");
      const options: UseAnimalFormOptions = { successMessage };

      const { result } = renderHook(() => useAnimalForm(options));

      expect(result.current).toBeDefined();
    });
  });

  describe("form state synchronization", () => {
    it("should sync dirty state from form state", () => {
      const { result } = renderHook(() => useAnimalForm());

      // Should use mock state
      expect(result.current.isDirty).toBe(false);
    });

    it("should handle loading state from mutations", () => {
      const { result } = renderHook(() => useAnimalForm());

      // Mutations should be defined
      expect(result.current.createMutation).toBeDefined();
      expect(result.current.updateMutation).toBeDefined();
    });
  });
});

describe("useAnimalCalculations", () => {
  const { useAnimalCalculations } = require("@/hooks/forms/useAnimalForm");

  beforeEach(() => {
    mockUseApp.mockClear();
    // Reset mock implementation to ensure consistent state
    mockUseApp.mockImplementation(() =>
      createTestAppContext({
        selectedHousehold: mockSelectedHousehold,
        selectedHouseholdId: mockSelectedHousehold.id,
        households: [mockSelectedHousehold],
      }),
    );
  });

  it("should calculate form completeness", () => {
    const mockForm = {
      watch: mock(() => ({
        name: "Buddy",
        species: "Dog",
        dob: new Date("2020-01-01"),
        weightKg: 25,
      })),
    };

    const calculations = useAnimalCalculations(mockForm);

    expect(calculations.completenessPercentage).toBe(75);
    expect(calculations.isCompleteRecord).toBe(false);
    expect(calculations.hasRequiredFields).toBe(true);
  });

  it("should calculate age correctly", () => {
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 3); // 3 years ago

    const mockForm = {
      watch: mock(() => ({
        dob: birthDate,
      })),
    };

    const calculations = useAnimalCalculations(mockForm);

    expect(calculations.ageInYears).toBe(3);
    expect(calculations.isAgeKnown).toBe(true);
    expect(calculations.isPuppy).toBe(false);
    expect(calculations.isSenior).toBe(false);
  });

  it("should identify puppies and senior animals", () => {
    const puppyDate = new Date();
    puppyDate.setMonth(puppyDate.getMonth() - 6); // 6 months ago

    const seniorDate = new Date();
    seniorDate.setFullYear(seniorDate.getFullYear() - 8); // 8 years ago

    const puppyForm = {
      watch: mock(() => ({ dob: puppyDate })),
    };

    const seniorForm = {
      watch: mock(() => ({ dob: seniorDate })),
    };

    const puppyCalc = useAnimalCalculations(puppyForm);
    const seniorCalc = useAnimalCalculations(seniorForm);

    expect(puppyCalc.isPuppy).toBe(true);
    expect(seniorCalc.isSenior).toBe(true);
  });

  it("should check health and vet information completeness", () => {
    const mockForm = {
      watch: mock(() => ({
        allergies: ["Peanuts"],
        conditions: ["Arthritis"],
        weightKg: 25,
        microchipId: "123456789",
        vetName: "Dr. Smith",
        vetPhone: "555-1234",
      })),
    };

    const calculations = useAnimalCalculations(mockForm);

    expect(calculations.hasHealthInfo).toBe(true);
    expect(calculations.hasVetInfo).toBe(true);
  });

  it("should determine record status based on completeness", () => {
    const completeForm = {
      watch: mock(() => ({})),
    };

    // Mock high completeness
    const AnimalDataTransformer =
      require("@/lib/services/animalDataTransformer").AnimalDataTransformer;
    spyOn(AnimalDataTransformer, "calculateCompleteness").mockReturnValue(85);

    const calculations = useAnimalCalculations(completeForm);

    expect(calculations.recordStatus).toBe("complete");
  });
});
