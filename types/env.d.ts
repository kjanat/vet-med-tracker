declare namespace NodeJS {
	interface ProcessEnv {
		// Database
		DATABASE_URL: string;
		DATABASE_URL_UNPOOLED?: string;
		DATABASE_URL_POOLED?: string;

		// Authentication (Clerk)
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
		CLERK_SECRET_KEY: string;
		NEXT_PUBLIC_CLERK_SIGN_IN_URL?: string;
		NEXT_PUBLIC_CLERK_SIGN_UP_URL?: string;
		NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL?: string;
		NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL?: string;

		// Application
		NODE_ENV: "development" | "production" | "test";
		VERCEL_URL?: string;
		NEXT_PUBLIC_APP_URL?: string;

		// Feature Flags
		NEXT_PUBLIC_ENABLE_PWA?: string;
		NEXT_PUBLIC_ENABLE_ANALYTICS?: string;

		// Testing
		PLAYWRIGHT_TEST_BASE_URL?: string;
		CI?: string;
	}
}
