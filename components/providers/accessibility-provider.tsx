"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface AccessibilityState {
  announcements: {
    polite: string;
    assertive: string;
  };
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: "small" | "medium" | "large";
}

type AccessibilityAction =
  | { type: "SET_ACCESSIBILITY"; payload: Partial<AccessibilityState> }
  | {
      type: "ANNOUNCE";
      payload: { message: string; priority: "polite" | "assertive" };
    };

// =============================================================================
// DEFAULT VALUES
// =============================================================================

const defaultAccessibilityState: AccessibilityState = {
  announcements: {
    assertive: "",
    polite: "",
  },
  fontSize: "medium",
  highContrast: false,
  reducedMotion: false,
};

// =============================================================================
// REDUCER
// =============================================================================

const initialState: AccessibilityState = defaultAccessibilityState;

function accessibilityReducer(
  state: AccessibilityState,
  action: AccessibilityAction,
): AccessibilityState {
  switch (action.type) {
    case "SET_ACCESSIBILITY":
      return {
        ...state,
        ...action.payload,
      };

    case "ANNOUNCE": {
      const { message, priority } = action.payload;
      return {
        ...state,
        announcements: {
          ...state.announcements,
          [priority]: message,
        },
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT & PROVIDER
// =============================================================================

export interface AccessibilityContextType extends AccessibilityState {
  announce: (message: string, priority?: "polite" | "assertive") => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null,
);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider",
    );
  }
  return context;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);
  const timeoutRefs = useRef<Map<string, number>>(new Map());

  // =============================================================================
  // ACCESSIBILITY MANAGEMENT
  // =============================================================================

  // Clear announcements after timeout
  useEffect(() => {
    const { polite, assertive } = state.announcements;

    if (polite) {
      const timeoutId = window.setTimeout(() => {
        dispatch({
          payload: { message: "", priority: "polite" },
          type: "ANNOUNCE",
        });
      }, 1000);
      timeoutRefs.current.set("polite", timeoutId);
    }

    if (assertive) {
      const timeoutId = window.setTimeout(() => {
        dispatch({
          payload: { message: "", priority: "assertive" },
          type: "ANNOUNCE",
        });
      }, 1000);
      timeoutRefs.current.set("assertive", timeoutId);
    }

    return () => {
      const refs = timeoutRefs.current;
      refs.forEach((id) => {
        clearTimeout(id);
      });
      refs.clear();
    };
  }, [state.announcements]);

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      dispatch({ payload: { message, priority }, type: "ANNOUNCE" });
    },
    [],
  );

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: AccessibilityContextType = useMemo(
    () => ({
      ...state,
      announce,
    }),
    [state, announce],
  );

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Global accessibility live regions */}
      <output
        aria-atomic="true"
        aria-live="polite"
        className="sr-only"
        id="global-announcer-polite"
      >
        {state.announcements.polite}
      </output>
      <div
        aria-atomic="true"
        aria-live="assertive"
        className="sr-only"
        id="global-announcer-assertive"
        role="alert"
      >
        {state.announcements.assertive}
      </div>
    </AccessibilityContext.Provider>
  );
}
