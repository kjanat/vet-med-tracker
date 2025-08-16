/**
 * Unit tests for useDaysOfSupply hook
 * Tests the mapping function between inventory items and days of supply data
 */

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDaysOfSupply } from "@/hooks/inventory/useDaysOfSupply";
import { testInventoryItem } from "@/tests/helpers/test-fixtures";

describe("useDaysOfSupply", () => {
  it("returns map with server data when provided", () => {
    const inventoryItems = [
      { id: "item-1", unitsRemaining: 30 },
      { id: "item-2", unitsRemaining: 15 },
    ];

    const serverData = [
      { itemId: "item-1", daysLeft: 15, animalName: "Buddy" },
      { itemId: "item-2", daysLeft: 5, animalName: "Max" },
    ];

    const { result } = renderHook(() =>
      useDaysOfSupply(inventoryItems, serverData),
    );

    expect(result.current).toBeInstanceOf(Map);
    expect(result.current.get("item-1")).toBe(15);
    expect(result.current.get("item-2")).toBe(5);
  });

  it("sets null for items without server data", () => {
    const inventoryItems = [
      { id: "item-1", unitsRemaining: 30 },
      { id: "item-2", unitsRemaining: 15 },
    ];

    const serverData = [
      { itemId: "item-1", daysLeft: 15, animalName: "Buddy" },
      // item-2 has no server data
    ];

    const { result } = renderHook(() =>
      useDaysOfSupply(inventoryItems, serverData),
    );

    expect(result.current.get("item-1")).toBe(15);
    expect(result.current.get("item-2")).toBeNull();
  });

  it("handles empty inventory items", () => {
    const inventoryItems: Array<{ id: string; unitsRemaining: number }> = [];
    const serverData = [
      { itemId: "item-1", daysLeft: 15, animalName: "Buddy" },
    ];

    const { result } = renderHook(() =>
      useDaysOfSupply(inventoryItems, serverData),
    );

    expect(result.current).toBeInstanceOf(Map);
    expect(result.current.get("item-1")).toBe(15);
    expect(result.current.size).toBe(1);
  });

  it("handles empty server data", () => {
    const inventoryItems = [
      { id: "item-1", unitsRemaining: 30 },
      { id: "item-2", unitsRemaining: 15 },
    ];

    const { result } = renderHook(() => useDaysOfSupply(inventoryItems, []));

    expect(result.current.get("item-1")).toBeNull();
    expect(result.current.get("item-2")).toBeNull();
    expect(result.current.size).toBe(2);
  });

  it("updates when inputs change", () => {
    const initialItems = [{ id: "item-1", unitsRemaining: 30 }];
    const initialServerData = [
      { itemId: "item-1", daysLeft: 15, animalName: "Buddy" },
    ];

    const { result, rerender } = renderHook(
      ({ items, serverData }) => useDaysOfSupply(items, serverData),
      {
        initialProps: {
          items: initialItems,
          serverData: initialServerData,
        },
      },
    );

    expect(result.current.get("item-1")).toBe(15);

    // Update with new data
    const newItems = [
      { id: "item-1", unitsRemaining: 30 },
      { id: "item-2", unitsRemaining: 20 },
    ];
    const newServerData = [
      { itemId: "item-1", daysLeft: 10, animalName: "Buddy" },
      { itemId: "item-2", daysLeft: 8, animalName: "Max" },
    ];

    rerender({ items: newItems, serverData: newServerData });

    expect(result.current.get("item-1")).toBe(10);
    expect(result.current.get("item-2")).toBe(8);
    expect(result.current.size).toBe(2);
  });

  it("handles assigned animal data in inventory items", () => {
    const inventoryItems = [
      { id: "item-1", unitsRemaining: 30, assignedAnimalId: "animal-1" },
      { id: "item-2", unitsRemaining: 15, assignedAnimalId: "animal-2" },
    ];

    const serverData = [
      { itemId: "item-1", daysLeft: 15, animalName: "Buddy" },
    ];

    const { result } = renderHook(() =>
      useDaysOfSupply(inventoryItems, serverData),
    );

    expect(result.current.get("item-1")).toBe(15);
    expect(result.current.get("item-2")).toBeNull();
  });
});
