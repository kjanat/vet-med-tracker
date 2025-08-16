"use client";

import { useEffect, useMemo, useState } from "react";

// Consistent breakpoints across the entire app
const BREAKPOINTS = {
  mobile: 768, // <768px
  tablet: 1024, // 768-1024px
  desktop: 1024, // >1024px
} as const;

type ResponsiveState = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  width: number | undefined;
  height: number | undefined;
};

export function useResponsive(): ResponsiveState {
  // Initialize with undefined for SSR safety
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouchDevice: false,
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    // Ensure we're in the browser environment
    if (typeof window === "undefined") return;

    const updateResponsiveState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      const isMobile = width < BREAKPOINTS.mobile;
      const isTablet =
        width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
      const isDesktop = width >= BREAKPOINTS.desktop;

      // Detect touch device capability
      const isTouchDevice =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia("(pointer: coarse)").matches;

      setState({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        width,
        height,
      });
    };

    // Set initial state
    updateResponsiveState();

    // Create media query listeners for better performance
    const mobileQuery = window.matchMedia(
      `(max-width: ${BREAKPOINTS.mobile - 1}px)`,
    );
    const tabletQuery = window.matchMedia(
      `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`,
    );
    const desktopQuery = window.matchMedia(
      `(min-width: ${BREAKPOINTS.tablet}px)`,
    );

    // Use modern addEventListener if available, with fallback
    const addListener = (query: MediaQueryList, handler: () => void) => {
      if (query.addEventListener) {
        query.addEventListener("change", handler);
      } else {
        // Fallback for older browsers
        query.addListener(handler);
      }
    };

    const removeListener = (query: MediaQueryList, handler: () => void) => {
      if (query.removeEventListener) {
        query.removeEventListener("change", handler);
      } else {
        // Fallback for older browsers
        query.removeListener(handler);
      }
    };

    // Add listeners
    addListener(mobileQuery, updateResponsiveState);
    addListener(tabletQuery, updateResponsiveState);
    addListener(desktopQuery, updateResponsiveState);

    // Also listen to resize for width/height changes
    window.addEventListener("resize", updateResponsiveState);

    // Cleanup function
    return () => {
      removeListener(mobileQuery, updateResponsiveState);
      removeListener(tabletQuery, updateResponsiveState);
      removeListener(desktopQuery, updateResponsiveState);
      window.removeEventListener("resize", updateResponsiveState);
    };
  }, []);

  // Memoize the result to prevent unnecessary re-renders
  return useMemo(() => state, [state]);
}

// Backward compatibility hooks
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive();
  return isMobile;
}

export function useIsTablet(): boolean {
  const { isTablet } = useResponsive();
  return isTablet;
}

export function useIsDesktop(): boolean {
  const { isDesktop } = useResponsive();
  return isDesktop;
}

// Additional utility hooks
export function useMobileDetection() {
  const { isMobile, isTouchDevice } = useResponsive();
  return { isMobile, isTouchDevice };
}

export function useWindowDimensions() {
  const { width, height } = useResponsive();
  return { width, height };
}

// Custom media query hook for specific breakpoints
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Create event listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener with fallback for older browsers
    if (media.addEventListener) {
      media.addEventListener("change", listener);
    } else {
      media.addListener(listener);
    }

    // Clean up
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

// Export breakpoints for consistency
export { BREAKPOINTS };
