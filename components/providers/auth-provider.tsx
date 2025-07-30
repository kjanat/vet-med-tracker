"use client";

import { createContext, type ReactNode, useContext } from "react";
import { useAuthBase } from "@/hooks/useAuth";

interface AuthContextValue {
	user: ReturnType<typeof useAuthBase>["user"];
	households: ReturnType<typeof useAuthBase>["households"];
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
	login: () => void;
	logout: () => Promise<void>;
	refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const auth = useAuthBase();

	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
}

// Export the hook for components that need auth state
export { useRequireAuth } from "@/hooks/useAuth";
