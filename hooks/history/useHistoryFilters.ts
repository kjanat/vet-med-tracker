"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import {
  createTypedQueryString,
  getTypedSearchParams,
  type HistorySearchParams,
  updateSearchParams,
} from "@/lib/utils/search-params";

export interface HistoryFilters {
  animalId?: string;
  regimenId?: string;
  caregiverId?: string;
  type: "all" | "scheduled" | "prn";
  view: "list" | "calendar";
  from: string; // ISO date
  to: string; // ISO date
}

export function useHistoryFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Memoize the search params string to prevent unnecessary recalculations
  // This provides more granular dependency tracking than using searchParams directly
  const searchParamsString = useMemo(
    () => searchParams.toString(),
    [searchParams],
  );

  // Memoize the parsed parameters to prevent re-parsing on every render
  const typedParams = useMemo(() => {
    return getTypedSearchParams<HistorySearchParams>(
      new URLSearchParams(searchParamsString),
      "history",
      {
        type: "all",
        view: "list",
      },
    );
  }, [searchParamsString]);

  // Memoize the final filters object to prevent unnecessary re-renders downstream
  const filters = useMemo((): HistoryFilters => {
    // Use stable empty strings to avoid hydration mismatch
    const defaultFrom = typedParams.from || "";
    const defaultTo = typedParams.to || "";

    return {
      animalId: typedParams.animalId,
      regimenId: typedParams.regimenId,
      caregiverId: typedParams.caregiverId,
      type: typedParams.type || "all",
      view: typedParams.view || "list",
      from: defaultFrom,
      to: defaultTo,
    };
  }, [typedParams]);

  // Memoize the createQueryString helper to prevent recreating on every render
  // Use searchParamsString for more granular dependency tracking
  const createQueryString = useCallback(
    (updates: Record<string, string | undefined>) => {
      return createTypedQueryString(
        updates,
        new URLSearchParams(searchParamsString),
      );
    },
    [searchParamsString],
  );

  // Optimize setFilter callback - removed filters dependency to prevent recreation
  // when filters object changes (which happens on every URL change)
  const setFilter = useCallback(
    (key: keyof HistoryFilters, value: string | undefined) => {
      const queryString = createQueryString({ [key]: value });

      // Use the recommended Next.js pattern
      router.push(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });

      // Fire instrumentation event - calculate current filters inline to avoid dependency
      if (typeof window !== "undefined") {
        // Calculate current filters from search params to avoid filters dependency
        // This prevents the callback from being recreated every time the URL changes
        const currentParams = getTypedSearchParams<HistorySearchParams>(
          new URLSearchParams(searchParamsString),
          "history",
          { type: "all", view: "list" },
        );
        const currentFilters = { ...currentParams, [key]: value };
        window.dispatchEvent(
          new CustomEvent("history_filter_change", {
            detail: { key, value, filters: currentFilters },
          }),
        );
      }
    },
    [router, pathname, createQueryString, searchParamsString], // Removed filters dependency
  );

  // Optimize setFilters with more granular dependency
  const setFilters = useCallback(
    (newFilters: Partial<HistoryFilters>) => {
      const queryString = updateSearchParams(
        new URLSearchParams(searchParamsString),
        newFilters,
      );

      router.push(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    },
    [router, pathname, searchParamsString],
  );

  // Set default dates after mount if not provided in URL
  useEffect(() => {
    if (!searchParams.get("from") || !searchParams.get("to")) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const updates: Record<string, string> = {};
      if (!searchParams.get("from")) {
        updates.from = thirtyDaysAgo.toISOString().split("T")[0] || "";
      }
      if (!searchParams.get("to")) {
        updates.to = now.toISOString().split("T")[0] || "";
      }

      const queryString = createQueryString(updates);
      router.replace(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    }
  }, [router, pathname, searchParams, createQueryString]);

  return { filters, setFilter, setFilters };
}
