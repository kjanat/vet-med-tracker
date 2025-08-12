import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
	tokenStore: "nextjs-cookie",
	// Add error handling and retry configuration
	urls: {
		signIn: "/handler/sign-in",
		signUp: "/handler/sign-up",
		afterSignIn: "/",
		afterSignUp: "/",
		afterSignOut: "/",
		// Add error page for rate limits
		error: "/auth-error",
	},
});
