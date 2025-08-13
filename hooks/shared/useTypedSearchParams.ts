"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  createTypedQueryString,
  getTypedSearchParams,
  removeSearchParams,
  type SearchParamPageType,
  updateSearchParams,
} from "@/lib/utils/search-params";

/**
 * Generic hook for managing typed search parameters
 *
 * @template T - The type of search parameters
 * @param pageType - The page type for validation
 * @param defaults - Default values for parameters
 * @returns Object with parameter utilities
 */
export function useTypedSearchParams<
  T extends Record<string, string | undefined>,
>(pageType: SearchParamPageType, defaults: Partial<T> = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get typed parameters with defaults
  const params = getTypedSearchParams<T>(
    new URLSearchParams(searchParams.toString()),
    pageType,
    defaults,
  );

  /**
   * Updates a single parameter
   */
  const setParam = useCallback(
    (key: keyof T, value: string | undefined) => {
      const queryString = updateSearchParams(
        new URLSearchParams(searchParams.toString()),
        { [key]: value },
      );

      router.push(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  /**
   * Updates multiple parameters at once
   */
  const setParams = useCallback(
    (newParams: Partial<T>) => {
      const queryString = updateSearchParams(
        new URLSearchParams(searchParams.toString()),
        newParams,
      );

      router.push(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  /**
   * Replaces all parameters with new ones
   */
  const replaceParams = useCallback(
    (newParams: Partial<T>) => {
      const queryString = createTypedQueryString(newParams);

      router.push(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    },
    [router, pathname],
  );

  /**
   * Removes specific parameters
   */
  const removeParams = useCallback(
    (keysToRemove: (keyof T)[]) => {
      const queryString = removeSearchParams(
        new URLSearchParams(searchParams.toString()),
        keysToRemove as string[],
      );

      router.push(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  /**
   * Resets all parameters to defaults
   */
  const resetParams = useCallback(() => {
    const queryString = createTypedQueryString(defaults);

    router.push(`${pathname}?${queryString}` as Route, {
      scroll: false,
    });
  }, [router, pathname, defaults]);

  /**
   * Checks if a parameter has a specific value
   */
  const hasParamValue = useCallback(
    (key: keyof T, value: string) => {
      return searchParams.get(key as string) === value;
    },
    [searchParams],
  );

  /**
   * Gets a parameter value with fallback
   */
  const getParamWithFallback = useCallback(
    (key: keyof T, fallback: string) => {
      const value = params[key as string];
      return value !== undefined ? value : fallback;
    },
    [params],
  );

  /**
   * Creates a URL with updated parameters (without navigation)
   */
  const createUrlWithParams = useCallback(
    (newParams: Partial<T>) => {
      const queryString = updateSearchParams(
        new URLSearchParams(searchParams.toString()),
        newParams,
      );
      return `${pathname}${queryString ? `?${queryString}` : ""}`;
    },
    [pathname, searchParams],
  );

  /**
   * Navigates with updated parameters using replace instead of push
   */
  const replaceWithParams = useCallback(
    (newParams: Partial<T>) => {
      const queryString = updateSearchParams(
        new URLSearchParams(searchParams.toString()),
        newParams,
      );

      router.replace(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  return {
    params,
    setParam,
    setParams,
    replaceParams,
    removeParams,
    resetParams,
    hasParamValue,
    getParamWithFallback,
    createUrlWithParams,
    replaceWithParams,
  };
}

/**
 * Specialized hook for history filters
 */
export function useTypedHistoryParams() {
  return useTypedSearchParams("history", {
    type: "all" as const,
    view: "list" as const,
  });
}

/**
 * Specialized hook for settings tabs
 */
export function useTypedSettingsParams() {
  return useTypedSearchParams("settings", {
    tab: "data" as const,
  });
}

/**
 * Specialized hook for insights filters
 */
export function useTypedInsightsParams() {
  return useTypedSearchParams("insights", {
    view: "summary" as const,
    metric: "all" as const,
  });
}

/**
 * Specialized hook for record parameters
 */
export function useTypedRecordParams() {
  return useTypedSearchParams("record", {
    mode: "quick" as const,
  });
}
