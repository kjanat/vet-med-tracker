"use client";

import { useUser } from "@stackframe/stack";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";

interface OnboardingCheckerProps {
  children: React.ReactNode;
}

export function OnboardingChecker({ children }: OnboardingCheckerProps) {
  const user = useUser();
  const pathname = usePathname();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setShowOnboarding(null);
      return;
    }

    // Check if user needs onboarding
    const hasPreferences = Boolean(
      user.clientMetadata?.vetMedPreferences ||
        user.clientMetadata?.householdSettings,
    );
    const hasCompletedOnboarding = Boolean(
      user.clientMetadata?.onboardingComplete,
    );
    const needsOnboarding = !hasPreferences && !hasCompletedOnboarding;

    // Don't show onboarding on profile pages or if already completed
    const isProfilePage = pathname.startsWith("/profile");
    const shouldShow = needsOnboarding && !isProfilePage;

    // Only update if value actually changed to prevent re-render loops
    setShowOnboarding((prevShow) =>
      prevShow !== shouldShow ? shouldShow : prevShow,
    );
  }, [user, pathname]);

  // Show loading while determining onboarding status
  if (user === undefined || showOnboarding === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-green-600 border-b-2"></div>
      </div>
    );
  }

  // Definitive rendering based on stable state
  return showOnboarding ? <WelcomeFlow /> : children;
}
