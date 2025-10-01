import { describe, expect, it } from "bun:test";
import { cn } from "@/lib/utils/general.ts";

describe("general utilities", () => {
  describe("cn", () => {
    it("should merge basic class names", () => {
      expect(cn("class1", "class2")).toBe("class1 class2");
    });

    it("should handle conditional classes", () => {
      expect(cn("base", "conditional", false)).toBe("base conditional");
    });

    it("should handle empty inputs", () => {
      expect(cn()).toBe("");
      expect(cn("", "", "")).toBe("");
    });

    it("should merge tailwind classes correctly", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });

    it("should handle arrays", () => {
      expect(cn(["class1", "class2"])).toBe("class1 class2");
    });

    it("should handle objects", () => {
      expect(cn({ class1: true, class2: false, class3: true })).toBe(
        "class1 class3",
      );
    });

    it("should handle mixed input types", () => {
      expect(
        cn("base", ["array1", "array2"], { obj1: true, obj2: false }),
      ).toBe("base array1 array2 obj1");
    });

    it("should handle undefined and null", () => {
      expect(cn("base", undefined, null, "end")).toBe("base end");
    });

    it("should merge conflicting tailwind utilities", () => {
      // Later utilities should override earlier ones
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
      expect(cn("bg-white", "bg-black")).toBe("bg-black");
    });
  });
});
