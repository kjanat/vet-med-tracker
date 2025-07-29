export const AUTH_COOKIES = {
	ACCESS_TOKEN: "vetmed-access-token",
	REFRESH_TOKEN: "vetmed-refresh-token",
	OAUTH_STATE: "oauth_state",
} as const;

export const AUTH_ROUTES = {
	LOGIN: "/api/auth/login",
	LOGOUT: "/api/auth/logout",
	CALLBACK: "/api/auth/callback",
	ME: "/api/auth/me",
} as const;

export const SESSION_DURATION = {
	ACCESS_TOKEN: 60 * 60 * 24, // 24 hours in seconds
	REFRESH_TOKEN: 60 * 60 * 24 * 30, // 30 days in seconds
	OAUTH_STATE: 60 * 10, // 10 minutes in seconds
} as const;
