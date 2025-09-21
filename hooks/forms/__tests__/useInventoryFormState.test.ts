import { describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useInventoryFormState } from "../useInventoryFormState";

describe("useInventoryFormState", () => {
  describe("Initial State", () => {
    test("should initialize with default state", () => {
      const { result } = renderHook(() => useInventoryFormState());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should initialize with custom initial state", () => {
      const initialState = {
        error: "Test error",
        isDirty: true,
        isOpen: true,
      };

      const { result } = renderHook(() =>
        useInventoryFormState({ initialState }),
      );

      expect(result.current.isOpen).toBe(true);
      expect(result.current.isDirty).toBe(true);
      expect(result.current.error).toBe("Test error");
    });

    test("should handle partial initial state", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({
          initialState: { isOpen: true },
        }),
      );

      expect(result.current.isOpen).toBe(true);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should handle empty initial state object", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({ initialState: {} }),
      );

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Form Opening", () => {
    test("should open form and reset state", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({
          initialState: { error: "Previous error", isDirty: true },
        }),
      );

      act(() => {
        result.current.openForm();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should call onOpen callback when provided", () => {
      const onOpenMock = mock(() => {});

      const { result } = renderHook(() =>
        useInventoryFormState({ onOpen: onOpenMock }),
      );

      act(() => {
        result.current.openForm();
      });

      expect(onOpenMock).toHaveBeenCalledTimes(1);
      expect(result.current.isOpen).toBe(true);
    });

    test("should work without onOpen callback", () => {
      const { result } = renderHook(() => useInventoryFormState());

      expect(() => {
        act(() => {
          result.current.openForm();
        });
      }).not.toThrow();

      expect(result.current.isOpen).toBe(true);
    });

    test("should handle multiple consecutive opens", () => {
      const onOpenMock = mock(() => {});

      const { result } = renderHook(() =>
        useInventoryFormState({ onOpen: onOpenMock }),
      );

      act(() => {
        result.current.openForm();
      });

      act(() => {
        result.current.setDirty(true);
        result.current.setError("Some error");
      });

      act(() => {
        result.current.openForm(); // Second open should reset state
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
      expect(onOpenMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("Form Closing", () => {
    test("should close form and reset all state", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({
          initialState: {
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
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should call onClose callback when provided", () => {
      const onCloseMock = mock(() => {});

      const { result } = renderHook(() =>
        useInventoryFormState({
          initialState: { isOpen: true },
          onClose: onCloseMock,
        }),
      );

      act(() => {
        result.current.closeForm();
      });

      expect(onCloseMock).toHaveBeenCalledTimes(1);
      expect(result.current.isOpen).toBe(false);
    });

    test("should work without onClose callback", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({
          initialState: { isOpen: true },
        }),
      );

      expect(() => {
        act(() => {
          result.current.closeForm();
        });
      }).not.toThrow();

      expect(result.current.isOpen).toBe(false);
    });

    test("should work correctly when closing already closed form", () => {
      const onCloseMock = mock(() => {});

      const { result } = renderHook(() =>
        useInventoryFormState({ onClose: onCloseMock }),
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
      const { result } = renderHook(() => useInventoryFormState());

      act(() => {
        result.current.setDirty(true);
      });

      expect(result.current.isDirty).toBe(true);
    });

    test("should set dirty state to false", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({
          initialState: { isDirty: true },
        }),
      );

      act(() => {
        result.current.setDirty(false);
      });

      expect(result.current.isDirty).toBe(false);
    });

    test("should handle multiple dirty state changes", () => {
      const { result } = renderHook(() => useInventoryFormState());

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

    test("should maintain dirty state independently of other state", () => {
      const { result } = renderHook(() => useInventoryFormState());

      act(() => {
        result.current.setDirty(true);
        result.current.setError("Error message");
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.error).toBe("Error message");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Error State Management", () => {
    test("should set error message", () => {
      const { result } = renderHook(() => useInventoryFormState());

      act(() => {
        result.current.setError("Test error message");
      });

      expect(result.current.error).toBe("Test error message");
    });

    test("should clear error using setError(null)", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({
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
        useInventoryFormState({
          initialState: { error: "Existing error" },
        }),
      );

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    test("should handle multiple error state changes", () => {
      const { result } = renderHook(() => useInventoryFormState());

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
      const { result } = renderHook(() => useInventoryFormState());

      act(() => {
        result.current.setError("");
      });

      expect(result.current.error).toBe("");
    });

    test("should handle overwriting existing error", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({
          initialState: { error: "Original error" },
        }),
      );

      act(() => {
        result.current.setError("New error");
      });

      expect(result.current.error).toBe("New error");
    });
  });

  describe("Complete Workflows", () => {
    test("should handle complete form lifecycle", () => {
      const onOpenMock = mock(() => {});
      const onCloseMock = mock(() => {});

      const { result } = renderHook(() =>
        useInventoryFormState({
          onClose: onCloseMock,
          onOpen: onOpenMock,
        }),
      );

      // Initial state
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();

      // Open form
      act(() => {
        result.current.openForm();
      });

      expect(result.current.isOpen).toBe(true);
      expect(onOpenMock).toHaveBeenCalledTimes(1);

      // Simulate user interaction
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
      expect(result.current.isDirty).toBe(true);

      // Close form
      act(() => {
        result.current.closeForm();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    test("should handle error state persistence during form operations", () => {
      const { result } = renderHook(() =>
        useInventoryFormState({
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

    test("should handle rapid state changes without issues", () => {
      const { result } = renderHook(() => useInventoryFormState());

      act(() => {
        result.current.openForm();
        result.current.setDirty(true);
        result.current.setError("Error");
        result.current.clearError();
        result.current.setDirty(false);
        result.current.closeForm();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("Callback Dependencies", () => {
    test("should maintain callback stability when options don't change", () => {
      const options = { onClose: mock(() => {}), onOpen: mock(() => {}) };
      const { result, rerender } = renderHook(() =>
        useInventoryFormState(options),
      );

      const firstOpenForm = result.current.openForm;
      const firstCloseForm = result.current.closeForm;
      const firstSetError = result.current.setError;
      const firstSetDirty = result.current.setDirty;
      const firstClearError = result.current.clearError;

      rerender();

      expect(result.current.openForm).toBe(firstOpenForm);
      expect(result.current.closeForm).toBe(firstCloseForm);
      expect(result.current.setError).toBe(firstSetError);
      expect(result.current.setDirty).toBe(firstSetDirty);
      expect(result.current.clearError).toBe(firstClearError);
    });

    test("should update callbacks when onOpen changes", () => {
      const firstOnOpen = mock(() => {});
      const { result, rerender } = renderHook(
        ({ onOpen }) => useInventoryFormState({ onOpen }),
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
        ({ onClose }) => useInventoryFormState({ onClose }),
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
    test("should handle missing optional callbacks gracefully", () => {
      const { result } = renderHook(() => useInventoryFormState({}));

      expect(() => {
        act(() => {
          result.current.openForm();
          result.current.closeForm();
        });
      }).not.toThrow();
    });

    test("should handle undefined options", () => {
      const { result } = renderHook(() => useInventoryFormState(undefined));

      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();

      expect(() => {
        act(() => {
          result.current.openForm();
          result.current.closeForm();
        });
      }).not.toThrow();
    });

    test("should handle callbacks that throw errors", () => {
      const throwingOnOpen = mock(() => {
        throw new Error("Callback error");
      });

      const { result } = renderHook(() =>
        useInventoryFormState({ onOpen: throwingOnOpen }),
      );

      expect(() => {
        act(() => {
          result.current.openForm();
        });
      }).toThrow("Callback error");

      // State should still be updated despite callback error
      expect(result.current.isOpen).toBe(true);
    });

    test("should handle state consistency during callback errors", () => {
      const throwingOnClose = mock(() => {
        throw new Error("Close callback error");
      });

      const { result } = renderHook(() =>
        useInventoryFormState({
          initialState: { error: "Test error", isDirty: true, isOpen: true },
          onClose: throwingOnClose,
        }),
      );

      expect(() => {
        act(() => {
          result.current.closeForm();
        });
      }).toThrow("Close callback error");

      // State should still be reset despite callback error
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    test("should handle concurrent state updates", () => {
      const { result } = renderHook(() => useInventoryFormState());

      // Simulate concurrent updates
      act(() => {
        result.current.setError("Error 1");
        result.current.setDirty(true);
        result.current.setError("Error 2");
        result.current.setDirty(false);
      });

      expect(result.current.error).toBe("Error 2");
      expect(result.current.isDirty).toBe(false);
    });

    test("should maintain referential equality for action functions", () => {
      const { result } = renderHook(() => useInventoryFormState());

      const setError1 = result.current.setError;
      const setDirty1 = result.current.setDirty;
      const clearError1 = result.current.clearError;

      act(() => {
        result.current.setError("Test");
      });

      const setError2 = result.current.setError;
      const setDirty2 = result.current.setDirty;
      const clearError2 = result.current.clearError;

      expect(setError1).toBe(setError2);
      expect(setDirty1).toBe(setDirty2);
      expect(clearError1).toBe(clearError2);
    });
  });
});
