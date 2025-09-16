import { describe, expect, it, spyOn } from "bun:test";
import { renderHook } from "@testing-library/react";
import { useDebounce } from "@/hooks/shared/useDebounce";

describe("useDebounce", () => {
  it("should return the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 500));
    expect(result.current).toBe("initial");
  });

  it("should work with different data types", () => {
    // String
    const { result: stringResult } = renderHook(() =>
      useDebounce("test string", 100),
    );
    expect(stringResult.current).toBe("test string");

    // Number
    const { result: numberResult } = renderHook(() => useDebounce(42, 100));
    expect(numberResult.current).toBe(42);

    // Object
    const testObject = { key: "value" };
    const { result: objectResult } = renderHook(() =>
      useDebounce(testObject, 100),
    );
    expect(objectResult.current).toEqual(testObject);
  });

  it("should handle zero delay", () => {
    const { result } = renderHook(() => useDebounce("test", 0));
    expect(result.current).toBe("test");
  });

  it("should handle different delay values", () => {
    const { result: fastResult } = renderHook(() => useDebounce("fast", 10));
    expect(fastResult.current).toBe("fast");

    const { result: slowResult } = renderHook(() => useDebounce("slow", 1000));
    expect(slowResult.current).toBe("slow");
  });

  it("should use setTimeout and clearTimeout appropriately", () => {
    const setTimeoutSpy = spyOn(global, "setTimeout");
    const clearTimeoutSpy = spyOn(global, "clearTimeout");

    const { rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: "initial" },
    });

    // Initial render should call setTimeout once
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);

    // Changing value should clear previous timeout and set new one
    rerender({ value: "changed" });
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 100);
  });

  it("should cleanup timeout on unmount", () => {
    const clearTimeoutSpy = spyOn(global, "clearTimeout");

    const { unmount } = renderHook(() => useDebounce("test", 500));

    // The hook should cleanup on unmount
    unmount();

    // clearTimeout should be called during cleanup
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
