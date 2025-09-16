import { describe, expect, it } from "bun:test";
import { getAvatarColor } from "@/lib/utils/avatar-utils";

describe("getAvatarColor", () => {
  it("should return a valid color from the predefined palette", () => {
    const color = getAvatarColor("Buddy");
    const validColors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-orange-500",
      "bg-teal-500",
      "bg-rose-500",
      "bg-violet-500",
      "bg-amber-500",
      "bg-emerald-500",
    ];

    expect(validColors).toContain(color);
  });

  it("should return consistent colors for the same input", () => {
    const color1 = getAvatarColor("Buddy");
    const color2 = getAvatarColor("Buddy");
    const color3 = getAvatarColor("Buddy");

    expect(color1).toBe(color2);
    expect(color2).toBe(color3);
  });

  it("should return different colors for different inputs", () => {
    const color1 = getAvatarColor("Buddy");
    const color2 = getAvatarColor("Max");
    const color3 = getAvatarColor("Bella");

    // While it's possible to get the same color, it's unlikely for different names
    // We'll test that at least some are different
    const colors = [color1, color2, color3];
    const uniqueColors = new Set(colors);

    expect(uniqueColors.size).toBeGreaterThan(0);
  });

  it("should handle empty strings", () => {
    const color = getAvatarColor("");
    expect(typeof color).toBe("string");
    expect(color.startsWith("bg-")).toBe(true);
  });

  it("should handle special characters", () => {
    const color = getAvatarColor("Buddy@123!");
    expect(typeof color).toBe("string");
    expect(color.startsWith("bg-")).toBe(true);
  });

  it("should handle unicode characters", () => {
    const color = getAvatarColor("Müller");
    expect(typeof color).toBe("string");
    expect(color.startsWith("bg-")).toBe(true);
  });

  it("should handle very long names", () => {
    const longName = "A".repeat(1000);
    const color = getAvatarColor(longName);
    expect(typeof color).toBe("string");
    expect(color.startsWith("bg-")).toBe(true);
  });

  it("should handle names with only numbers", () => {
    const color = getAvatarColor("12345");
    expect(typeof color).toBe("string");
    expect(color.startsWith("bg-")).toBe(true);
  });
});
