import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { Animal } from "@/lib/utils/types";
import { useAnimalForm } from "./useAnimalForm";

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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
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
});
