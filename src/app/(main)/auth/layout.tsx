/**
 * Authenticated Routes Layout - Clean Architecture with Refactored Providers
 *
 * Single layout for all authenticated routes using Strategy Pattern
 * Context comes from the top-level ConsolidatedAppProvider in (main)/layout
 */

import type React from "react";
import { OnboardingChecker } from "@/components/auth/onboarding-checker";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingChecker>
      <DashboardLayout>{children}</DashboardLayout>
    </OnboardingChecker>
  );
}
