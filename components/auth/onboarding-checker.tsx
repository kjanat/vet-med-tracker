"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { WelcomeFlow } from "@/components/onboarding/welcome-flow";

interface OnboardingCheckerProps {
	children: React.ReactNode;
}

export function OnboardingChecker({ children }: OnboardingCheckerProps) {
	const { user, isLoaded } = useUser();
	const pathname = usePathname();
	const [showOnboarding, setShowOnboarding] = useState(false);

	useEffect(() => {
		if (!isLoaded || !user) return;

		// Check if user needs onboarding
		const hasPreferences =
			user.unsafeMetadata?.vetMedPreferences ||
			user.unsafeMetadata?.householdSettings;
		const hasCompletedOnboarding = user.publicMetadata?.onboardingComplete;
		const needsOnboarding = !hasPreferences && !hasCompletedOnboarding;

		// Don't show onboarding on profile pages or if already completed
		const isProfilePage = pathname.startsWith("/profile");
		const shouldShowOnboarding = needsOnboarding && !isProfilePage;

		setShowOnboarding(shouldShowOnboarding);
	}, [user, isLoaded, pathname]);

	// Show loading while determining onboarding status
	if (!isLoaded) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
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
