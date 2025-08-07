import { createCallerFactory, createTRPCRouter } from "../trpc";
import { adminRouter } from "./admin";
import { animalRouter } from "./animals";
import { auditRouter } from "./audit";
import { householdRouter } from "./households";
import { insightsRouter } from "./insights";
import { inventoryRouter } from "./inventory";
import { medicationRouter } from "./medication";
import { notificationsRouter } from "./notifications";
import { regimenRouter } from "./regimens";
import { reportsRouter } from "./reports";
import { userRouter } from "./user";

// Root router combining all sub-routers
export const appRouter = createTRPCRouter({
	animal: animalRouter,
	household: householdRouter,
	regimen: regimenRouter,
	admin: adminRouter,
	inventory: inventoryRouter,
	medication: medicationRouter,
	insights: insightsRouter,
	reports: reportsRouter,
	user: userRouter,
	audit: auditRouter,
	notifications: notificationsRouter,
});

// Export type for use in client
export type AppRouter = typeof appRouter;

// Export caller factory for testing
export const createTRPCCaller = createCallerFactory(appRouter);
