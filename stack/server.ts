import "server-only";
import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: "/handler/sign-in",
    signUp: "/handler/sign-up",
    afterSignIn: "/",
    afterSignUp: "/",
    afterSignOut: "/",
    error: "/auth-error",
  },
});

export const getUser = stackServerApp.getUser.bind(stackServerApp);
export const useUser = stackServerApp.useUser.bind(stackServerApp);
export const getTeam = stackServerApp.getTeam.bind(stackServerApp);
export const useTeam = stackServerApp.useTeam.bind(stackServerApp);
export const listUsers = stackServerApp.listUsers.bind(stackServerApp);
export const createUser = stackServerApp.createUser.bind(stackServerApp);
export const createTeam = stackServerApp.createTeam.bind(stackServerApp);

export type StackUser = Awaited<ReturnType<typeof getUser>>;
export type StackTeam = Awaited<ReturnType<typeof getTeam>>;

export async function requireUser() {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
