import { createCallerFactory, createTRPCRouter } from "../trpc/init";
import { adminRouter } from "./admin";
import { animalRouter } from "./animals";
import { householdRouter } from "./households";
import { inventoryRouter } from "./inventory";
import { medicationRouter } from "./medication";
import { regimenRouter } from "./regimens";
import { userRouter } from "./user";

// Root router combining all sub-routers
export const appRouter = createTRPCRouter({
	animal: animalRouter,
	household: householdRouter,
	regimen: regimenRouter,
	admin: adminRouter,
	inventory: inventoryRouter,
	medication: medicationRouter,
	user: userRouter,
});

// Export type for use in client
export type AppRouter = typeof appRouter;

// Export caller factory for testing
export const createTRPCCaller = createCallerFactory(appRouter);
