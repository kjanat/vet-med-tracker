import { createTRPCRouter } from "../trpc/init";
import { adminRouter } from "./admin";
import { animalRouter } from "./animals";
import { householdRouter } from "./households";
import { inventoryRouter } from "./inventory";
import { regimenRouter } from "./regimens";

// Root router combining all sub-routers
export const appRouter = createTRPCRouter({
	animal: animalRouter,
	household: householdRouter,
	regimen: regimenRouter,
	admin: adminRouter,
	inventory: inventoryRouter,
});

// Export type for use in client
export type AppRouter = typeof appRouter;
