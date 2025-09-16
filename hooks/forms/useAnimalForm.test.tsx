import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import type { useForm } from "react-hook-form";
import { vi } from "vitest";
import type { AnimalFormData } from "@/lib/schemas/animal";
import type { Animal } from "@/lib/utils/types";
import { useAnimalCalculations, useAnimalForm } from "./useAnimalForm";

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
      animal: {
        list: { invalidate: vi.fn() },
      },
      household: {
        getAnimals: { invalidate: vi.fn() },
      },
    }),
    animal: {
      create: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({
            id: "animal-1",
            name: "Test Animal",
            species: "Dog",
          }),
          isPending: false,
        }),
      },
      update: {
        useMutation: () => ({
          mutateAsync: vi.fn().mockResolvedValue({
            id: "animal-1",
            name: "Updated Animal",
            species: "Dog",
          }),
          isPending: false,
        }),
      },
    },
  },
}));

const mockAnimal: Animal = {
  id: "animal-1",
  name: "Test Dog",
  species: "Dog",
  breed: "Golden Retriever",
  sex: "Male",
  neutered: true,
  dob: new Date("2020-01-01"),
  weightKg: 30.5,
  microchipId: "123456789",
  color: "Golden",
  timezone: "America/New_York",
  vetName: "Dr. Smith",
  vetPhone: "555-1234",
  allergies: ["peanuts"],
  conditions: ["hip dysplasia"],
  photo: "https://example.com/photo.jpg",
  pendingMeds: 0,
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

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = "TestWrapper";
  return TestWrapper;
}

describe("useAnimalForm", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.editingAnimal).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it("should open form for new animal", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.editingAnimal).toBe(null);
  });

  it("should open form for existing animal", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm(mockAnimal);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.editingAnimal).toEqual(mockAnimal);

    // Check that form is populated with animal data
    expect(result.current.form.getValues().name).toBe(mockAnimal.name);
    expect(result.current.form.getValues().species).toBe(mockAnimal.species);
  });

  it("should close form and reset state", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm(mockAnimal);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.closeForm();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.editingAnimal).toBe(null);
    expect(result.current.isDirty).toBe(false);
  });

  it("should call onSave callback when provided", () => {
    const onSave = vi.fn();
    const { result } = renderHook(() => useAnimalForm({ onSave }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    const formData = {
      name: "New Dog",
      species: "Dog",
      breed: "",
      sex: "Male" as const,
      neutered: false,
      dob: undefined,
      weightKg: undefined,
      microchipId: "",
      color: "",
      timezone: "America/New_York",
      vetName: "",
      vetPhone: "",
      allergies: [],
      conditions: [],
      photoUrl: "",
    };

    act(() => {
      result.current.saveForm(formData);
    });

    waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ name: "New Dog" }),
        true, // isNew = true
      );
    });
  });

  it("should reset form to default values", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm(mockAnimal);
    });

    // Form should have animal data
    expect(result.current.form.getValues().name).toBe(mockAnimal.name);

    // Modify the form value to something else
    act(() => {
      result.current.form.setValue("name", "Modified Name");
    });

    expect(result.current.form.getValues().name).toBe("Modified Name");

    act(() => {
      result.current.resetForm();
    });

    // Form should be reset to original animal data (not empty)
    expect(result.current.form.getValues().name).toBe(mockAnimal.name);
    expect(result.current.isDirty).toBe(false);
  });

  it("should handle validation errors", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.openForm();
    });

    const invalidFormData = {
      name: "", // Required field is empty
      species: "", // Required field is empty
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
      allergies: [],
      conditions: [],
      photoUrl: "",
    };

    act(() => {
      result.current.saveForm(invalidFormData);
    });

    // Form should still be open due to validation error
    expect(result.current.isOpen).toBe(true);
  });

  it("should set dirty state when form changes", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.setDirty(true);
    });

    expect(result.current.isDirty).toBe(true);
  });

  it("should manage error state", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    expect(result.current.error).toBe(null);

    // Test error state management
    act(() => {
      result.current.openForm();
    });

    // Test validation error scenario
    const invalidFormData = {
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
      allergies: [],
      conditions: [],
      photoUrl: "",
    };

    act(() => {
      result.current.saveForm(invalidFormData);
    });

    // Should remain open due to validation error
    expect(result.current.isOpen).toBe(true);
  });

  it("should provide clearErrorAction functionality", () => {
    const { result } = renderHook(() => useAnimalForm(), {
      wrapper: createWrapper(),
    });

    // Verify clearErrorAction is available
    expect(typeof result.current.clearErrorAction).toBe("function");

    // Function should be callable without errors
    act(() => {
      result.current.clearErrorAction();
    });

    expect(result.current.error).toBe(null);
  });
});

describe("useAnimalCalculations", () => {
  // Mock form setup for calculations testing
  const createMockForm = (formData: Partial<AnimalFormData>) => {
    const defaultFormData: AnimalFormData = {
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
    };

    return {
      watch: vi.fn().mockReturnValue({ ...defaultFormData, ...formData }),
      formState: { isDirty: false },
    } as unknown as ReturnType<typeof useForm<AnimalFormData>>;
  };

  it("should calculate age correctly for puppy", () => {
    const oneYearAgo = new Date();
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 6); // 6 months ago

    const mockForm = createMockForm({
      name: "Puppy",
      species: "Dog",
      dob: oneYearAgo,
    });

    const { result } = renderHook(() => useAnimalCalculations(mockForm));

    expect(result.current.isAgeKnown).toBe(true);
    expect(result.current.ageInYears).toBe(0);
    expect(result.current.isPuppy).toBe(true);
    expect(result.current.isSenior).toBe(false);
  });

  it("should calculate age correctly for senior dog", () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

    const mockForm = createMockForm({
      name: "Senior Dog",
      species: "Dog",
      dob: tenYearsAgo,
    });

    const { result } = renderHook(() => useAnimalCalculations(mockForm));

    expect(result.current.isAgeKnown).toBe(true);
    expect(result.current.ageInYears).toBe(10);
    expect(result.current.isPuppy).toBe(false);
    expect(result.current.isSenior).toBe(true);
  });

  it("should handle unknown age gracefully", () => {
    const mockForm = createMockForm({
      name: "Mystery Pet",
      species: "Cat",
      dob: undefined,
    });

    const { result } = renderHook(() => useAnimalCalculations(mockForm));

    expect(result.current.isAgeKnown).toBe(false);
    expect(result.current.ageInYears).toBe(null);
    expect(result.current.isPuppy).toBe(false);
    expect(result.current.isSenior).toBe(false);
  });

  it("should calculate completeness percentage correctly", () => {
    const mockForm = createMockForm({
      name: "Complete Pet",
      species: "Dog",
      breed: "Golden Retriever",
      sex: "Male",
      weightKg: 30,
      microchipId: "123456",
      vetName: "Dr. Smith",
      vetPhone: "555-1234",
    });

    const { result } = renderHook(() => useAnimalCalculations(mockForm));

    expect(result.current.completenessPercentage).toBeGreaterThan(50);
    expect(result.current.hasRequiredFields).toBe(true);
  });

  it("should detect health information presence", () => {
    const mockForm = createMockForm({
      name: "Healthy Pet",
      species: "Dog",
      allergies: ["peanuts"],
      conditions: ["hip dysplasia"],
      weightKg: 25.5,
    });

    const { result } = renderHook(() => useAnimalCalculations(mockForm));

    expect(result.current.hasHealthInfo).toBe(true);
  });

  it("should detect vet information presence", () => {
    const mockForm = createMockForm({
      name: "Tracked Pet",
      species: "Cat",
      vetName: "Dr. Johnson",
      vetPhone: "555-9876",
      vetEmail: "dr.johnson@vetclinic.com",
      clinicName: "Pet Care Clinic",
    });

    const { result } = renderHook(() => useAnimalCalculations(mockForm));

    expect(result.current.hasVetInfo).toBe(true);
  });

  it("should determine record status correctly", () => {
    const completeForm = createMockForm({
      name: "Complete Pet",
      species: "Dog",
      breed: "Labrador",
      sex: "Female",
      neutered: true,
      dob: new Date("2020-01-01"),
      weightKg: 28,
      microchipId: "987654321",
      color: "Black",
      vetName: "Dr. Complete",
      vetPhone: "555-0000",
      allergies: ["none"],
      conditions: ["healthy"],
    });

    const { result: completeResult } = renderHook(() =>
      useAnimalCalculations(completeForm),
    );
    expect(completeResult.current.recordStatus).toBe("complete");

    const minimalForm = createMockForm({
      name: "Basic Pet",
      species: "Cat",
    });

    const { result: minimalResult } = renderHook(() =>
      useAnimalCalculations(minimalForm),
    );
    expect(minimalResult.current.recordStatus).toBe("minimal");
  });
});
