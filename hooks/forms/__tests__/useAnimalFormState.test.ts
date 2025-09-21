import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import type { Animal } from "@/lib/utils/types";
import { useAnimalFormState } from "../useAnimalFormState";

// Mock animal data for testing
const createMockAnimal = (overrides = {}): Animal => ({
  allergies: [],
  breed: "Golden Retriever",
  conditions: [],
  id: "animal-123",
  name: "Buddy",
  pendingMeds: 0,
  species: "Dog",
  timezone: "America/New_York",
  ...overrides,
});

describe("useAnimalFormState", () => {
  describe("Initial State", () => {
    test("should initialize with default state", () => {
      const { result } = renderHook(() => useAnimalFormState());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.editingAnimal).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should initialize with custom initial state", () => {
      const mockAnimal = createMockAnimal();
      const initialState = {
        editingAnimal: mockAnimal,
        error: "Test error",
        isDirty: true,
        isOpen: true,
      };

      const { result } = renderHook(() => useAnimalFormState({ initialState }));

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingAnimal).toEqual(mockAnimal);
      expect(result.current.isDirty).toBe(true);
      expect(result.current.error).toBe("Test error");
    });

    test("should handle partial initial state", () => {
      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: { isDirty: true, isOpen: true },
        }),
      );

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingAnimal).toBeNull();
      expect(result.current.isDirty).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Form Opening", () => {
    test("should open form for new animal creation", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.openForm();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingAnimal).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should open form for editing existing animal", () => {
      const mockAnimal = createMockAnimal();
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.openForm(mockAnimal);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingAnimal).toEqual(mockAnimal);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should handle opening form with null animal", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.openForm(null);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingAnimal).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should handle opening form with undefined animal", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.openForm(undefined);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingAnimal).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should reset dirty and error state when opening form", () => {
      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: { error: "Previous error", isDirty: true },
        }),
      );

      act(() => {
        result.current.openForm();
      });

      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should call onOpen callback when provided", () => {
      const onOpenMock = mock(() => {});
      const mockAnimal = createMockAnimal();

      const { result } = renderHook(() =>
        useAnimalFormState({ onOpen: onOpenMock }),
      );

      act(() => {
        result.current.openForm(mockAnimal);
      });

      expect(onOpenMock).toHaveBeenCalledWith(mockAnimal);
      expect(onOpenMock).toHaveBeenCalledTimes(1);
    });

    test("should call onOpen callback with null when no animal provided", () => {
      const onOpenMock = mock(() => {});

      const { result } = renderHook(() =>
        useAnimalFormState({ onOpen: onOpenMock }),
      );

      act(() => {
        result.current.openForm();
      });

      expect(onOpenMock).toHaveBeenCalledWith(null);
      expect(onOpenMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Form Closing", () => {
    test("should close form and reset all state", () => {
      const mockAnimal = createMockAnimal();
      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: {
            editingAnimal: mockAnimal,
            error: "Test error",
            isDirty: true,
            isOpen: true,
          },
        }),
      );

      act(() => {
        result.current.closeForm();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.editingAnimal).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should call onClose callback when provided", () => {
      const onCloseMock = mock(() => {});

      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: { isOpen: true },
          onClose: onCloseMock,
        }),
      );

      act(() => {
        result.current.closeForm();
      });

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test("should work correctly when closing already closed form", () => {
      const onCloseMock = mock(() => {});

      const { result } = renderHook(() =>
        useAnimalFormState({ onClose: onCloseMock }),
      );

      act(() => {
        result.current.closeForm();
      });

      expect(result.current.isOpen).toBe(false);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Dirty State Management", () => {
    test("should set dirty state to true", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.setDirty(true);
      });

      expect(result.current.isDirty).toBe(true);
    });

    test("should set dirty state to false", () => {
      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: { isDirty: true },
        }),
      );

      act(() => {
        result.current.setDirty(false);
      });

      expect(result.current.isDirty).toBe(false);
    });

    test("should handle multiple dirty state changes", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.setDirty(true);
      });
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.setDirty(false);
      });
      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.setDirty(true);
      });
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe("Error State Management", () => {
    test("should set error message", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.setError("Test error message");
      });

      expect(result.current.error).toBe("Test error message");
    });

    test("should clear error using setError(null)", () => {
      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: { error: "Existing error" },
        }),
      );

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });

    test("should clear error using clearError", () => {
      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: { error: "Existing error" },
        }),
      );

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    test("should handle multiple error state changes", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.setError("First error");
      });
      expect(result.current.error).toBe("First error");

      act(() => {
        result.current.setError("Second error");
      });
      expect(result.current.error).toBe("Second error");

      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();
    });

    test("should handle setting empty string as error", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.setError("");
      });

      expect(result.current.error).toBe("");
    });
  });

  describe("State Combinations and Workflows", () => {
    test("should handle complete create workflow", () => {
      const onOpenMock = mock(() => {});
      const onCloseMock = mock(() => {});

      const { result } = renderHook(() =>
        useAnimalFormState({
          onClose: onCloseMock,
          onOpen: onOpenMock,
        }),
      );

      // Initial state
      expect(result.current.isOpen).toBe(false);
      expect(result.current.editingAnimal).toBeNull();

      // Open for create
      act(() => {
        result.current.openForm();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingAnimal).toBeNull();
      expect(onOpenMock).toHaveBeenCalledWith(null);

      // Simulate form interaction
      act(() => {
        result.current.setDirty(true);
      });

      expect(result.current.isDirty).toBe(true);

      // Close form
      act(() => {
        result.current.closeForm();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test("should handle complete edit workflow", () => {
      const mockAnimal = createMockAnimal();
      const onOpenMock = mock(() => {});
      const onCloseMock = mock(() => {});

      const { result } = renderHook(() =>
        useAnimalFormState({
          onClose: onCloseMock,
          onOpen: onOpenMock,
        }),
      );

      // Open for edit
      act(() => {
        result.current.openForm(mockAnimal);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.editingAnimal).toEqual(mockAnimal);
      expect(onOpenMock).toHaveBeenCalledWith(mockAnimal);

      // Simulate editing
      act(() => {
        result.current.setDirty(true);
      });

      expect(result.current.isDirty).toBe(true);

      // Simulate error during save
      act(() => {
        result.current.setError("Save failed");
      });

      expect(result.current.error).toBe("Save failed");

      // Clear error and retry
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();

      // Close form
      act(() => {
        result.current.closeForm();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.editingAnimal).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test("should handle switching between animals", () => {
      const animal1 = createMockAnimal({ id: "1", name: "Buddy" });
      const animal2 = createMockAnimal({ id: "2", name: "Charlie" });

      const { result } = renderHook(() => useAnimalFormState());

      // Open for first animal
      act(() => {
        result.current.openForm(animal1);
      });

      expect(result.current.editingAnimal).toEqual(animal1);

      // Set dirty state
      act(() => {
        result.current.setDirty(true);
      });

      // Switch to second animal (should reset dirty state)
      act(() => {
        result.current.openForm(animal2);
      });

      expect(result.current.editingAnimal).toEqual(animal2);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isOpen).toBe(true);
    });

    test("should handle error state persistence across form operations", () => {
      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: { error: "Initial error" },
        }),
      );

      expect(result.current.error).toBe("Initial error");

      // Opening form should clear error
      act(() => {
        result.current.openForm();
      });

      expect(result.current.error).toBeNull();

      // Set new error
      act(() => {
        result.current.setError("New error");
      });

      expect(result.current.error).toBe("New error");

      // Closing form should clear error
      act(() => {
        result.current.closeForm();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("Callback Dependencies", () => {
    test("should maintain callback stability when options don't change", () => {
      const options = { onClose: mock(() => {}), onOpen: mock(() => {}) };
      const { result, rerender } = renderHook(() =>
        useAnimalFormState(options),
      );

      const firstOpenForm = result.current.openForm;
      const firstCloseForm = result.current.closeForm;
      const firstClearError = result.current.clearError;

      rerender();

      expect(result.current.openForm).toBe(firstOpenForm);
      expect(result.current.closeForm).toBe(firstCloseForm);
      expect(result.current.clearError).toBe(firstClearError);
    });

    test("should update callbacks when onOpen changes", () => {
      const firstOnOpen = mock(() => {});
      const { result, rerender } = renderHook(
        ({ onOpen }) => useAnimalFormState({ onOpen }),
        { initialProps: { onOpen: firstOnOpen } },
      );

      const firstOpenForm = result.current.openForm;

      const secondOnOpen = mock(() => {});
      rerender({ onOpen: secondOnOpen });

      expect(result.current.openForm).not.toBe(firstOpenForm);

      // Test that new callback is used
      act(() => {
        result.current.openForm();
      });

      expect(secondOnOpen).toHaveBeenCalledTimes(1);
      expect(firstOnOpen).toHaveBeenCalledTimes(0);
    });

    test("should update callbacks when onClose changes", () => {
      const firstOnClose = mock(() => {});
      const { result, rerender } = renderHook(
        ({ onClose }) => useAnimalFormState({ onClose }),
        { initialProps: { onClose: firstOnClose } },
      );

      const firstCloseForm = result.current.closeForm;

      const secondOnClose = mock(() => {});
      rerender({ onClose: secondOnClose });

      expect(result.current.closeForm).not.toBe(firstCloseForm);

      // Test that new callback is used
      act(() => {
        result.current.closeForm();
      });

      expect(secondOnClose).toHaveBeenCalledTimes(1);
      expect(firstOnClose).toHaveBeenCalledTimes(0);
    });
  });

  describe("Edge Cases", () => {
    test("should handle rapid state changes", () => {
      const { result } = renderHook(() => useAnimalFormState());

      act(() => {
        result.current.openForm();
        result.current.setDirty(true);
        result.current.setError("Error");
        result.current.closeForm();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should handle missing optional callbacks gracefully", () => {
      const { result } = renderHook(() => useAnimalFormState({}));

      expect(() => {
        act(() => {
          result.current.openForm();
          result.current.closeForm();
        });
      }).not.toThrow();
    });

    test("should handle callbacks that throw errors", () => {
      const throwingOnClose = mock(() => {
        throw new Error("Callback error");
      });

      const { result } = renderHook(() =>
        useAnimalFormState({
          initialState: { isOpen: true },
          onClose: throwingOnClose,
        }),
      );

      expect(() => {
        act(() => {
          result.current.closeForm();
        });
      }).toThrow("Callback error");

      // When callback throws, state update doesn't complete
      expect(result.current.isOpen).toBe(true);
    });
  });
});
