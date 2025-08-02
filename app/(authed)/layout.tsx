import type React from "react";
import { OnboardingChecker } from "@/components/auth/onboarding-checker";
import { AnimalFormProvider } from "@/components/providers/animal-form-provider";
import { AppProvider } from "@/components/providers/app-provider";
import { InventoryFormProvider } from "@/components/providers/inventory-form-provider";
import { UserPreferencesProvider } from "@/components/providers/user-preferences-provider";

export default function AuthedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<UserPreferencesProvider>
			<AppProvider>
				<AnimalFormProvider>
					<InventoryFormProvider>
						<OnboardingChecker>{children}</OnboardingChecker>
					</InventoryFormProvider>
				</AnimalFormProvider>
			</AppProvider>
		</UserPreferencesProvider>
	);
}
