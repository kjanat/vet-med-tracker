import { describe, expect, it } from "bun:test";
import { cn } from "@/lib/utils/general";

describe("cn (className utility)", () => {
  it("should merge class names correctly", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("should handle undefined and null values", () => {
    expect(cn("class1", undefined, "class2", null)).toBe("class1 class2");
  });

  it("should handle empty strings", () => {
    expect(cn("class1", "", "class2")).toBe("class1 class2");
  });

  it("should merge Tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const isDisabled = false;

    expect(
      cn("btn", isActive && "btn-active", isDisabled && "btn-disabled"),
    ).toBe("btn btn-active");
  });

  it("should handle array inputs", () => {
    expect(cn(["class1", "class2"], "class3")).toBe("class1 class2 class3");
  });

  it("should handle nested arrays", () => {
    expect(cn(["class1", ["class2", "class3"]], "class4")).toBe(
      "class1 class2 class3 class4",
    );
  });

  it("should handle falsy values in arrays", () => {
    expect(cn(["class1", false, "class2", null, "class3"])).toBe(
      "class1 class2 class3",
    );
  });

  it("should handle object syntax", () => {
    expect(cn({ class1: true, class2: false, class3: true })).toBe(
      "class1 class3",
    );
  });

  it("should return empty string for no valid inputs", () => {
    expect(cn(undefined, null, "", false)).toBe("");
  });

  it("should handle single class name", () => {
    expect(cn("single-class")).toBe("single-class");
  });

  it("should handle complex Tailwind conflicts", () => {
    // twMerge resolves conflicts but keeps all non-conflicting classes
    expect(cn("text-red-500 text-sm", "text-blue-500 text-lg")).toBe(
      "text-blue-500 text-lg",
    );
  });
});
