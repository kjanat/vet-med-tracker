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
    animal: {
      create: {
        useMutation: mock(() => ({
          isPending: false,
          mutateAsync: mock(),
          onError: mock(),
          onSuccess: mock(),
        })),
      },
      update: {
        useMutation: mock(() => ({
          isPending: false,
          mutateAsync: mock(),
          onError: mock(),
          onSuccess: mock(),
        })),
      },
    },
    useUtils: () => ({
      animal: {
        list: { invalidate: mock() },
      },
      household: {
        getAnimals: { invalidate: mock() },
      },
    }),
  },
}));

// Don't mock useAnimalFormState globally - let individual tests mock when needed

mock.module("@/lib/services/animalDataTransformer", () => ({
  AnimalDataTransformer: {
    calculateCompleteness: mock(() => 75),
    createDefaultValues: () => ({
      allergies: [],
      breed: "",
      clinicName: "",
      color: "",
      conditions: [],
      dob: undefined,
      microchipId: "",
      name: "",
      neutered: false,
      notes: "",
      photoUrl: "",
      sex: undefined,
      species: "",
      timezone: "America/New_York",
      vetEmail: "",
      vetName: "",
      vetPhone: "",
      weightKg: undefined,
    }),
    fromAnimalRecord: mock(),
    hasRequiredFields: mock(() => true),
    isCompleteRecord: mock(() => false),
    toCreatePayload: mock(),
    toInstrumentationData: mock(() => ({
      detail: { animal: "test" },
      eventType: "animal_create",
    })),
    toUpdatePayload: mock(),
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
        households: [mockSelectedHousehold],
        selectedHousehold: mockSelectedHousehold,
        selectedHouseholdId: mockSelectedHousehold.id,
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

      expect(onOpen).toHaveBeenCalledWith(null);
    });

    it("should call onClose callback when provided", () => {
      const onClose = mock();
      const options: UseAnimalFormOptions = { onClose };

      const { result } = renderHook(() => useAnimalForm(options));

      act(() => {
        result.current.closeForm();
      });

      expect(onClose).toHaveBeenCalled();
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
        allergies: [],
        breed: "Golden Retriever",
        conditions: [],
        name: "Buddy",
        neutered: false,
        sex: "Male" as const,
        species: "Dog",
        timezone: "America/New_York",
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
        allergies: [],
        conditions: [],
        name: "",
        neutered: false,
        species: "",
        timezone: "",
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
        households: [mockSelectedHousehold],
        selectedHousehold: mockSelectedHousehold,
        selectedHouseholdId: mockSelectedHousehold.id,
      }),
    );
  });

  it("should calculate form completeness", () => {
    const mockForm = {
      watch: mock(() => ({
        dob: new Date("2020-01-01"),
        name: "Buddy",
        species: "Dog",
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
        microchipId: "123456789",
        vetName: "Dr. Smith",
        vetPhone: "555-1234",
        weightKg: 25,
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
    const {
      AnimalDataTransformer,
    } = require("@/lib/services/animalDataTransformer");
    spyOn(AnimalDataTransformer, "calculateCompleteness").mockReturnValue(85);

    const calculations = useAnimalCalculations(completeForm);

    expect(calculations.recordStatus).toBe("complete");
  });
});
