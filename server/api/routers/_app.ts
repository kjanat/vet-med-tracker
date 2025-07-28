import { createTRPCRouter } from "../trpc/init";
import { animalRouter } from "./animals";
import { householdRouter } from "./households";
import { regimenRouter } from "./regimens";
import { adminRouter } from "./admin";
import { inventoryRouter } from "./inventory";

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
