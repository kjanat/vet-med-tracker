import type React from "react";
import { AnimalFormProvider } from "@/components/providers/animal-form-provider";
import { AppProvider } from "@/components/providers/app-provider";
import { InventoryFormProvider } from "@/components/providers/inventory-form-provider";

export default function AuthedLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AppProvider>
			<AnimalFormProvider>
				<InventoryFormProvider>{children}</InventoryFormProvider>
			</AnimalFormProvider>
		</AppProvider>
	);
}
