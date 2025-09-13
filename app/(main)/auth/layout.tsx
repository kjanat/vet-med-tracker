/**
 * Authenticated Routes Layout - Clean Architecture with Refactored Providers
 *
 * Single layout for all authenticated routes using Strategy Pattern
 * Now includes the new AppProviderOrchestrator with dependency injection
 */

import type React from "react";
import { OnboardingChecker } from "@/components/auth/onboarding-checker";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AppProvider } from "@/components/providers/app-provider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppProvider>
      <OnboardingChecker>
        <DashboardLayout>{children}</DashboardLayout>
      </OnboardingChecker>
    </AppProvider>
  );
}
