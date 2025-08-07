"use client";

import { useUser } from "@stackframe/stack";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";

interface OnboardingCheckerProps {
	children: React.ReactNode;
}

export function OnboardingChecker({ children }: OnboardingCheckerProps) {
	const user = useUser();
	const pathname = usePathname();
	const [showOnboarding, setShowOnboarding] = useState(false);

	useEffect(() => {
		if (!user) return;

		// Check if user needs onboarding
		const hasPreferences =
			user.clientMetadata?.vetMedPreferences ||
			user.clientMetadata?.householdSettings;
		const hasCompletedOnboarding = user.clientMetadata?.onboardingComplete;
		const needsOnboarding = !hasPreferences && !hasCompletedOnboarding;

		// Don't show onboarding on profile pages or if already completed
		const isProfilePage = pathname.startsWith("/profile");
		const shouldShowOnboarding = needsOnboarding && !isProfilePage;

		setShowOnboarding(shouldShowOnboarding);
	}, [user, pathname]);

	// Show loading while determining onboarding status
	if (user === undefined) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gray-50">
				<div className="h-8 w-8 animate-spin rounded-full border-green-600 border-b-2"></div>
			</div>
		);
	}

	// Show onboarding flow for first-time users
	if (showOnboarding) {
		return <WelcomeFlow />;
	}

	// Show normal app content
	return <>{children}</>;
}
