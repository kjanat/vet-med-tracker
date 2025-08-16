"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  getTypedSearchParams,
  isValidUUID,
  type RecordSearchParams,
  updateSearchParams,
} from "@/lib/utils/search-params";

export interface RecordParams {
  /** Pre-selected animal ID */
  animalId?: string;
  /** Pre-selected regimen ID */
  regimenId?: string;
  /** Return URL after successful recording */
  returnTo?: string;
  /** Recording mode */
  mode: "quick" | "detailed";
}

/**
 * Custom hook for managing record page parameters with type safety
 *
 * @returns Object containing current parameters and setters
 */
export function useRecordParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Memoize search params string for stable dependency tracking
  const searchParamsString = useMemo(
    () => searchParams.toString(),
    [searchParams],
  );

  // Memoize parsed parameters to prevent re-parsing
  const typedParams = useMemo(() => {
    return getTypedSearchParams<RecordSearchParams>(
      new URLSearchParams(searchParamsString),
      "record",
      {
        mode: "quick",
      },
    );
  }, [searchParamsString]);

  // Memoize the params object to prevent unnecessary re-renders
  const params = useMemo((): RecordParams => {
    return {
      animalId: typedParams.animalId,
      regimenId: typedParams.regimenId,
      returnTo: typedParams.returnTo,
      mode: typedParams.mode || "quick",
    };
  }, [typedParams]);

  // Memoize validation functions to prevent recreation on every render
  // This avoids creating new functions each time and allows stable references
  const validateUUID = useCallback((key: string, value: string) => {
    if (!isValidUUID(value)) {
      console.warn(`Invalid UUID for ${key}: ${value}`);
      return false;
    }
    return true;
  }, []);

  const validateURL = useCallback((value: string) => {
    try {
      new URL(value);
      return true;
    } catch {
      console.warn(`Invalid URL for returnTo: ${value}`);
      return false;
    }
  }, []);

  /**
   * Updates a single parameter
   */
  const setParam = useCallback(
    (key: keyof RecordParams, value: string | undefined) => {
      // Validate UUID parameters
      if (
        (key === "animalId" || key === "regimenId") &&
        value &&
        !validateUUID(key, value)
      ) {
        return;
      }

      // Validate URL parameters
      if (key === "returnTo" && value && !validateURL(value)) {
        return;
      }

      const queryString = updateSearchParams(
        new URLSearchParams(searchParamsString),
        { [key]: value },
      );

      router.push(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    },
    [router, pathname, searchParamsString, validateUUID, validateURL],
  );

  /**
   * Updates multiple parameters at once
   */
  const setParams = useCallback(
    (newParams: Partial<RecordParams>) => {
      // Create a copy to avoid mutating the original
      const validatedParams = { ...newParams };

      // Validate UUID parameters using memoized function
      if (
        validatedParams.animalId &&
        !validateUUID("animalId", validatedParams.animalId)
      ) {
        delete validatedParams.animalId;
      }

      if (
        validatedParams.regimenId &&
        !validateUUID("regimenId", validatedParams.regimenId)
      ) {
        delete validatedParams.regimenId;
      }

      // Validate URL parameters using memoized function
      if (validatedParams.returnTo && !validateURL(validatedParams.returnTo)) {
        delete validatedParams.returnTo;
      }

      const queryString = updateSearchParams(
        new URLSearchParams(searchParamsString),
        validatedParams,
      );

      router.push(`${pathname}?${queryString}` as Route, {
        scroll: false,
      });
    },
    [router, pathname, searchParamsString, validateUUID, validateURL],
  );

  /**
   * Sets the selected animal and optionally a regimen
   */
  const setSelectedItems = useCallback(
    (animalId: string, regimenId?: string) => {
      if (!validateUUID("animalId", animalId)) {
        return;
      }

      if (regimenId && !validateUUID("regimenId", regimenId)) {
        return;
      }

      const updates: Partial<RecordParams> = { animalId };
      if (regimenId) {
        updates.regimenId = regimenId;
      }

      setParams(updates);
    },
    [setParams, validateUUID],
  );

  /**
   * Clears all selection parameters
   */
  const clearSelection = useCallback(() => {
    const queryString = updateSearchParams(
      new URLSearchParams(searchParamsString),
      {
        animalId: undefined,
        regimenId: undefined,
      },
    );

    router.push(`${pathname}?${queryString}` as Route, {
      scroll: false,
    });
  }, [router, pathname, searchParamsString]);

  /**
   * Sets the return URL for post-recording navigation
   */
  const setReturnUrl = useCallback(
    (url: string) => {
      if (validateURL(url)) {
        setParam("returnTo", url);
      }
    },
    [setParam, validateURL],
  );

  /**
   * Navigates to the return URL if set, otherwise to default
   */
  const navigateToReturn = useCallback(
    (defaultPath = "/dashboard") => {
      const returnUrl = params.returnTo || defaultPath;
      router.push(returnUrl as Route);
    },
    [router, params.returnTo],
  );

  /**
   * Checks if required parameters for recording are present
   * Memoized to prevent unnecessary recalculations
   */
  const isReadyToRecord = useMemo(() => {
    return Boolean(params.animalId && params.regimenId);
  }, [params.animalId, params.regimenId]);

  return {
    params,
    setParam,
    setParams,
    setSelectedItems,
    clearSelection,
    setReturnUrl,
    navigateToReturn,
    isReadyToRecord,
  };
}
