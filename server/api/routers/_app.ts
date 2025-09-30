import { router } from "../trpc";

// Create the app router - this will be populated with routes
export const appRouter = router({
  // Routes will be added here
});

export type AppRouter = typeof appRouter;

export default appRouter;
