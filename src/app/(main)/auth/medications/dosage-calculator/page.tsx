import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Calculate safe medication dosages for your pets with real-time safety validation",
  title: "Dosage Calculator | VetMed Tracker",
};

export default function DosageCalculatorPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="py-12 text-center">
        <h1 className="font-bold text-2xl text-gray-900">Dosage Calculator</h1>
        <p className="mt-2 text-gray-600">
          Smart dosage calculation tools coming soon
        </p>
      </div>
    </div>
  );
}
