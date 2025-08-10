import type { Metadata } from "next";
import { DosageCalculator } from "@/components/dosage-calculator";

export const metadata: Metadata = {
	title: "Dosage Calculator | VetMed Tracker",
	description:
		"Calculate safe medication dosages for your pets with real-time safety validation",
};

export default function DosageCalculatorPage() {
	return <DosageCalculator />;
}
