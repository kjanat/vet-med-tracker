import { createTRPCRouter } from "./trpc";
import { adminRouter } from "./routers/admin";
import { animalsRouter } from "./routers/animals";
import { auditRouter } from "./routers/audit";
import { cosignerRouter } from "./routers/cosigner";
import { householdRouter } from "./routers/household";
import { householdsRouter } from "./routers/households";
import { inventoryRouter } from "./routers/inventory";
import { notificationsRouter } from "./routers/notifications";
import { regimenRouter } from "./routers/regimen";
import { regimensRouter } from "./routers/regimens";
import { reportsRouter } from "./routers/reports";
import { userRouter } from "./routers/user";

/**
 * Main tRPC application router
 *
 * All feature-based routers are combined here for a clean, modular architecture.
 * Each router is organized by domain (animals, regimens, inventory, etc.)
 */
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  animals: animalsRouter,
  audit: auditRouter,
  cosigner: cosignerRouter,
  household: householdRouter,
  households: householdsRouter,
  inventory: inventoryRouter,
  notifications: notificationsRouter,
  regimen: regimenRouter, // Backward compatibility alias
  regimens: regimensRouter,
  reports: reportsRouter,
  user: userRouter,
});

/**
 * Inferred type for the entire tRPC API
 * Used by the client to provide type-safe API calls
 */
export type AppRouter = typeof appRouter;
