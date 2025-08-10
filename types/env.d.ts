declare namespace NodeJS {
	interface ProcessEnv {
		// Database
		DATABASE_URL: string;
		DATABASE_URL_UNPOOLED?: string;
		DATABASE_URL_POOLED?: string;

		// Authentication (Stack Auth)
		NEXT_PUBLIC_STACK_PROJECT_ID: string;
		NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: string;
		STACK_SECRET_SERVER_KEY: string;

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
