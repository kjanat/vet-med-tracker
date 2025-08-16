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

// Export commonly used methods for better type inference and convenience
export const getUser = stackServerApp.getUser.bind(stackServerApp);
export const useUser = stackServerApp.useUser.bind(stackServerApp);
export const getTeam = stackServerApp.getTeam.bind(stackServerApp);
export const useTeam = stackServerApp.useTeam.bind(stackServerApp);
export const listUsers = stackServerApp.listUsers.bind(stackServerApp);
export const createUser = stackServerApp.createUser.bind(stackServerApp);
export const createTeam = stackServerApp.createTeam.bind(stackServerApp);

// Export type helpers for better TypeScript support
export type StackUser = Awaited<ReturnType<typeof getUser>>;
export type StackTeam = Awaited<ReturnType<typeof getTeam>>;

// Helper function for protected pages
export async function requireUser() {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
