import { createCallerFactory, createTRPCRouter } from "../trpc";
import { adminRouter } from "./admin";
import { animalRouter } from "./animals";
import { auditRouter } from "./audit";
import { cosignerRouter } from "./cosigner";
import { dosageRouter } from "./dosage";
import { emergencyContactsRouter } from "./emergency-contacts";
import { householdRouter } from "./households";
import { insightsRouter } from "./insights";
import { inventoryRouter } from "./inventory";
import { medicationRouter } from "./medication";
import { notificationsRouter } from "./notifications";
import { regimenRouter } from "./regimens";
import { reportsRouter } from "./reports";
import { securityMonitoringRouter } from "./security-monitoring";
import { userRouter } from "./user";

// Root router combining all sub-routers
export const appRouter = createTRPCRouter({
  admin: adminRouter,
  animal: animalRouter,
  audit: auditRouter,
  cosigner: cosignerRouter,
  dosage: dosageRouter,
  emergencyContacts: emergencyContactsRouter,
  household: householdRouter,
  insights: insightsRouter,
  inventory: inventoryRouter,
  medication: medicationRouter,
  notifications: notificationsRouter,
  regimen: regimenRouter,
  reports: reportsRouter,
  security: securityMonitoringRouter,
  user: userRouter,
});

// Export type for use in client
export type AppRouter = typeof appRouter;

// Export caller factory for testing
export const createTRPCCaller = createCallerFactory(appRouter);
