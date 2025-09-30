"use client";

import { useEffect } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";

interface OnboardingCheckerProps {
  children: React.ReactNode;
}

export function OnboardingChecker({ children }: OnboardingCheckerProps) {
  const { userProfile, isAuthenticated } = useApp();

  useEffect(() => {
    // Check if user needs onboarding
    if (isAuthenticated && userProfile && !userProfile.onboarding.complete) {
      console.log("User needs onboarding");
      // Could redirect to onboarding flow here
    }
  }, [isAuthenticated, userProfile]);

  return <>{children}</>;
}
