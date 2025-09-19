"use client";

import { useUser } from "@stackframe/stack";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { vetmedUsers } from "@/db/schema";
import {
  defaultUserPreferences,
  defaultUserProfile,
} from "@/db/schema/user-defaults";
import { trpc } from "@/server/trpc/client";
import type { UserProfile } from "./app-provider-consolidated";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export type User = typeof vetmedUsers.$inferSelect;

interface StackUserForConversion {
  id: string;
  displayName?: string | null;
  profileImageUrl?: string | null;
  primaryEmail?: string | null;
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  authStatus: "loading" | "authenticated" | "unauthenticated";
  loading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_USER_PROFILE"; payload: UserProfile | null }
  | {
      type: "SET_AUTH_STATUS";
      payload: "loading" | "authenticated" | "unauthenticated";
    }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

// =============================================================================
// REDUCER
// =============================================================================

const initialState: AuthState = {
  authStatus: "loading",
  error: null,
  isAuthenticated: false,
  loading: true,
  user: null,
  userProfile: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_USER":
      return {
        ...state,
        authStatus: action.payload ? "authenticated" : "unauthenticated",
        isAuthenticated: Boolean(action.payload),
        user: action.payload,
      };

    case "SET_USER_PROFILE":
      return { ...state, userProfile: action.payload };

    case "SET_AUTH_STATUS":
      return {
        ...state,
        authStatus: action.payload,
        isAuthenticated: action.payload === "authenticated",
      };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT & PROVIDER
// =============================================================================

export interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const stackUser = useUser();

  // Convert Stack user to internal user format
  const convertStackUser = useCallback(
    (stackUser: StackUserForConversion): User => ({
      createdAt: new Date().toISOString(),
      defaultAnimalId: null,
      defaultHouseholdId: null,
      email: stackUser.primaryEmail || "",
      emailVerified: null,
      id: stackUser.id,
      image: stackUser.profileImageUrl || null,
      name: stackUser.displayName || stackUser.primaryEmail || "Unknown",
      onboardingComplete: null,
      onboardingCompletedAt: null,
      preferences: structuredClone(defaultUserPreferences),
      profile: structuredClone(defaultUserProfile),
      stackUserId: stackUser.id,
      updatedAt: new Date().toISOString(),
    }),
    [],
  );

  // Update user when Stack user changes
  useEffect(() => {
    const isLoaded = true; // Stack Auth loads synchronously
    if (isLoaded) {
      if (stackUser) {
        const user = convertStackUser(stackUser);
        dispatch({ payload: user, type: "SET_USER" });
        dispatch({ payload: "authenticated", type: "SET_AUTH_STATUS" });
      } else {
        dispatch({ payload: null, type: "SET_USER" });
        dispatch({ payload: "unauthenticated", type: "SET_AUTH_STATUS" });
      }
      dispatch({ payload: false, type: "SET_LOADING" });
    }
  }, [stackUser, convertStackUser]);

  // Get user profile data from tRPC
  const { data: userProfile, refetch: refetchProfile } =
    trpc.user.getProfile.useQuery(undefined, { enabled: Boolean(stackUser) });

  useEffect(() => {
    if (userProfile) {
      dispatch({ payload: userProfile, type: "SET_USER_PROFILE" });
    }
  }, [userProfile]);

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const login = useCallback(() => {
    window.location.href = "/handler/sign-in";
  }, []);

  const logout = useCallback(async () => {
    if (stackUser) {
      await stackUser.signOut();
    }
  }, [stackUser]);

  const refreshAuth = useCallback(async () => {
    await refetchProfile();
  }, [refetchProfile]);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: AuthContextType = useMemo(
    () => ({
      ...state,
      login,
      logout,
      refreshAuth,
    }),
    [state, login, logout, refreshAuth],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
