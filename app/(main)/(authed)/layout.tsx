import type React from "react";
import { OnboardingChecker } from "@/components/auth/onboarding-checker";

export default function AuthedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <OnboardingChecker>{children}</OnboardingChecker>;
}
