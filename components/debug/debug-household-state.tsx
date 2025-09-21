"use client";

import { useUser } from "@stackframe/stack";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { trpc } from "@/server/trpc/client";

export function DebugHouseholdState() {
  const { selectedHousehold, households } = useApp();
  const stackUser = useUser();
  const {
    data: householdData,
    isLoading,
    error,
  } = trpc.household.list.useQuery(undefined, {
    enabled: Boolean(stackUser),
  });

  const isAuthenticated = Boolean(stackUser);
  const user = useMemo(
    () =>
      stackUser
        ? {
            email: stackUser.primaryEmail || "",
            id: stackUser.id,
            name: stackUser.displayName || stackUser.primaryEmail || "Unknown",
          }
        : null,
    [stackUser],
  );
  const [localStorageValue, setLocalStorageValue] = useState<string>("SSR");

  // Only access localStorage after mounting to avoid hydration issues
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLocalStorageValue(
        localStorage.getItem("selectedHouseholdId") || "none",
      );
    }
  }, []);

  // Debug component provides visual debugging - no console logs needed in production

  return (
    <div className="fixed right-4 bottom-4 max-w-md rounded-lg bg-black/80 p-4 text-white text-xs">
      <h3 className="mb-2 font-bold">Debug Household State</h3>
      <div>Auth: {isAuthenticated ? "✓" : "✗"}</div>
      <div>User: {user?.email || "none"}</div>
      <div>API Loading: {isLoading ? "⏳" : "✓"}</div>
      <div>API Error: {error?.message || "none"}</div>
      <div>Households: {households.length}</div>
      <div>Selected: {selectedHousehold?.id || "none"}</div>
      <div>Selected Name: {selectedHousehold?.name || "none"}</div>
      <div>LocalStorage: {localStorageValue}</div>
      {householdData && householdData.length > 0 && (
        <div className="mt-2 border-white/20 border-t pt-2">
          <div className="font-bold">API Households:</div>
          {householdData.map((h) => (
            <div className="text-xs" key={h.id}>
              {h.name}: {h.id}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
