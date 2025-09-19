/**
 * Dosage Print Service
 * Handles print formatting for dosage calculations
 */

import type { DosageResult, SafetyLevel } from "@/lib/schemas/dosage";

// Safety level configuration for printing
const SAFETY_CONFIG: Record<
  SafetyLevel,
  {
    color: string;
    bgColor: string;
    textColor: string;
    label: string;
    icon: string;
  }
> = {
  caution: {
    bgColor: "rgb(254, 252, 232)", // yellow-50
    color: "rgb(234, 179, 8)", // yellow-500
    icon: "⚠",
    label: "Use Caution",
    textColor: "rgb(161, 98, 7)", // yellow-700
  },
  danger: {
    bgColor: "rgb(254, 242, 242)", // red-50
    color: "rgb(239, 68, 68)", // red-500
    icon: "!",
    label: "Dangerous",
    textColor: "rgb(185, 28, 28)", // red-700
  },
  safe: {
    bgColor: "rgb(240, 253, 244)", // green-50
    color: "rgb(34, 197, 94)", // green-500
    icon: "✓",
    label: "Safe Dose",
    textColor: "rgb(21, 128, 61)", // green-700
  },
};

export interface PrintData {
  animalName: string;
  animalSpecies: string;
  weight: number;
  weightUnit: "kg" | "lbs";
  medicationName: string;
  brandName?: string | null;
  route?: string;
  calculationResult: DosageResult;
}

/**
 * Generate printable HTML content for dosage calculation
 */
export function generatePrintContent(data: PrintData): string {
  const {
    animalName,
    animalSpecies,
    weight,
    weightUnit,
    medicationName,
    brandName,
    route,
    calculationResult,
  } = data;
  const safetyConfig = SAFETY_CONFIG[calculationResult.safetyLevel];

  const medicationDisplayName = brandName
    ? `${medicationName} (${brandName})`
    : medicationName;

  const warnings =
    calculationResult.warnings.length > 0
      ? `
      <div class="details">
        <h3>Warnings</h3>
        <ul>
          ${calculationResult.warnings.map((warning) => `<li class="warning">${warning}</li>`).join("")}
        </ul>
      </div>
    `
      : "";

  const adjustments =
    calculationResult.appliedAdjustments.length > 0
      ? `<p><strong>Adjustments:</strong> ${calculationResult.appliedAdjustments.join(", ")}</p>`
      : "";

  return `
    <html>
      <head>
        <title>Dosage Calculation - ${animalName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .result { background: ${safetyConfig.bgColor}; border: 2px solid ${safetyConfig.color};
                   padding: 15px; margin: 20px 0; border-radius: 8px; }
          .dose { font-size: 24px; font-weight: bold; color: ${safetyConfig.textColor}; }
          .details { margin: 20px 0; }
          .warning { color: ${safetyConfig.textColor}; font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>VetMed Tracker - Dosage Calculation</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="details">
          <h2>Patient Information</h2>
          <p><strong>Animal:</strong> ${animalName} (${animalSpecies})</p>
          <p><strong>Weight:</strong> ${weight} ${weightUnit}</p>
        </div>

        <div class="details">
          <h2>Medication</h2>
          <p><strong>Name:</strong> ${medicationDisplayName}</p>
          <p><strong>Route:</strong> ${route || "Not specified"}</p>
        </div>

        <div class="result">
          <h2>Calculated Dose</h2>
          <div class="dose">${calculationResult.dose} ${calculationResult.unit}</div>
          <p><strong>Safety Level:</strong> <span class="warning">${safetyConfig.label}</span></p>
          <p><strong>Range:</strong> ${calculationResult.minDose} - ${calculationResult.maxDose} ${calculationResult.unit}</p>
        </div>

        ${warnings}

        <div class="details">
          <h3>Calculation Details</h3>
          <p><strong>Method:</strong> ${calculationResult.calculationMethod}</p>
          <p><strong>Base dose:</strong> ${calculationResult.baseDoseMgKg} mg/kg</p>
          <p><strong>Final dose:</strong> ${calculationResult.finalDoseMgKg} mg/kg</p>
          ${adjustments}
        </div>

        <script>window.print();</script>
      </body>
    </html>
  `;
}

/**
 * Open print window with calculation data
 */
export function openPrintWindow(data: PrintData): boolean {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    return false;
  }

  const printContent = generatePrintContent(data);
  printWindow.document.write(printContent);
  printWindow.document.close();

  return true;
}

/**
 * Generate PDF-friendly content (for future PDF generation)
 */
export function generatePdfContent(data: PrintData): {
  title: string;
  subtitle: string;
  sections: Array<{
    title: string;
    content: Array<{ label: string; value: string }>;
  }>;
  warnings: string[];
  safetyLevel: {
    level: SafetyLevel;
    label: string;
    color: string;
  };
} {
  const {
    animalName,
    animalSpecies,
    weight,
    weightUnit,
    medicationName,
    brandName,
    route,
    calculationResult,
  } = data;
  const safetyConfig = SAFETY_CONFIG[calculationResult.safetyLevel];

  const medicationDisplayName = brandName
    ? `${medicationName} (${brandName})`
    : medicationName;

  return {
    safetyLevel: {
      color: safetyConfig.color,
      label: safetyConfig.label,
      level: calculationResult.safetyLevel,
    },
    sections: [
      {
        content: [
          { label: "Animal", value: `${animalName} (${animalSpecies})` },
          { label: "Weight", value: `${weight} ${weightUnit}` },
        ],
        title: "Patient Information",
      },
      {
        content: [
          { label: "Name", value: medicationDisplayName },
          { label: "Route", value: route || "Not specified" },
        ],
        title: "Medication",
      },
      {
        content: [
          {
            label: "Dose",
            value: `${calculationResult.dose} ${calculationResult.unit}`,
          },
          {
            label: "Range",
            value: `${calculationResult.minDose} - ${calculationResult.maxDose} ${calculationResult.unit}`,
          },
          { label: "Safety Level", value: safetyConfig.label },
        ],
        title: "Calculated Dose",
      },
      {
        content: [
          { label: "Method", value: calculationResult.calculationMethod },
          {
            label: "Base dose",
            value: `${calculationResult.baseDoseMgKg} mg/kg`,
          },
          {
            label: "Final dose",
            value: `${calculationResult.finalDoseMgKg} mg/kg`,
          },
          ...(calculationResult.appliedAdjustments.length > 0
            ? [
                {
                  label: "Adjustments",
                  value: calculationResult.appliedAdjustments.join(", "),
                },
              ]
            : []),
        ],
        title: "Calculation Details",
      },
    ],
    subtitle: `Generated on ${new Date().toLocaleString()}`,
    title: `Dosage Calculation - ${animalName}`,
    warnings: calculationResult.warnings,
  };
}
