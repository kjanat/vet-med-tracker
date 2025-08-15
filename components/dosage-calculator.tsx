"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calculator,
  Clock,
  History,
  Printer,
  RotateCcw,
  Save,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { MedicationSearch } from "@/components/medication/medication-search";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/shared/use-toast";
import type { DosageResult, SafetyLevel } from "@/lib/schemas/dosage";
import { trpc } from "@/server/trpc/client";

// Form schema for dosage calculation
const dosageCalculatorSchema = z.object({
  animalId: z.string().min(1, "Please select an animal"),
  medicationId: z.string().min(1, "Please select a medication"),
  weight: z.number().positive("Weight must be positive"),
  weightUnit: z.enum(["kg", "lbs"]),
  route: z.string().optional(),
  targetUnit: z.enum(["mg", "ml", "tablets"]).default("mg"),
  customAdjustment: z.string().optional(),
});

type DosageCalculatorForm = z.infer<typeof dosageCalculatorSchema>;

// Routes commonly used in veterinary medicine
const ADMINISTRATION_ROUTES = [
  { value: "oral", label: "Oral (PO)" },
  { value: "intramuscular", label: "Intramuscular (IM)" },
  { value: "intravenous", label: "Intravenous (IV)" },
  { value: "subcutaneous", label: "Subcutaneous (SC)" },
  { value: "topical", label: "Topical" },
  { value: "rectal", label: "Rectal (PR)" },
  { value: "ophthalmic", label: "Ophthalmic" },
  { value: "otic", label: "Otic" },
];

// Safety level colors and messages
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
  safe: {
    color: "rgb(34, 197, 94)", // green-500
    bgColor: "rgb(240, 253, 244)", // green-50
    textColor: "rgb(21, 128, 61)", // green-700
    label: "Safe Dose",
    icon: "✓",
  },
  caution: {
    color: "rgb(234, 179, 8)", // yellow-500
    bgColor: "rgb(254, 252, 232)", // yellow-50
    textColor: "rgb(161, 98, 7)", // yellow-700
    label: "Use Caution",
    icon: "⚠",
  },
  danger: {
    color: "rgb(239, 68, 68)", // red-500
    bgColor: "rgb(254, 242, 242)", // red-50
    textColor: "rgb(185, 28, 28)", // red-700
    label: "Dangerous",
    icon: "!",
  },
};

// Calculation history item
interface CalculationHistoryItem {
  id: string;
  timestamp: Date;
  animalName: string;
  medicationName: string;
  weight: number;
  weightUnit: "kg" | "lbs";
  dose: number;
  unit: string;
  safetyLevel: SafetyLevel;
  route?: string;
}

export function DosageCalculator() {
  const { animals, selectedAnimal, selectedHousehold } = useApp();
  const { toast } = useToast();

  // State management
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] =
    useState<DosageResult | null>(null);
  const [selectedMedication, setSelectedMedication] = useState<{
    genericName: string;
    brandName?: string | null;
  } | null>(null);
  const [calculationHistory, setCalculationHistory] = useState<
    CalculationHistoryItem[]
  >([]);

  // Form management
  const form = useForm<DosageCalculatorForm>({
    resolver: zodResolver(dosageCalculatorSchema),
    defaultValues: {
      animalId: selectedAnimal?.id || "",
      medicationId: "",
      weight: 0,
      weightUnit: "kg",
      route: "",
      targetUnit: "mg",
      customAdjustment: "",
    },
  });

  const { watch, setValue, reset } = form;
  const watchedValues = watch();

  // Auto-select animal when changed
  useEffect(() => {
    if (selectedAnimal?.id && watchedValues.animalId !== selectedAnimal.id) {
      setValue("animalId", selectedAnimal.id);
    }
  }, [selectedAnimal, setValue, watchedValues.animalId]);

  // Load calculation history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dosage-calculation-history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const history = parsed.map((item: CalculationHistoryItem) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
        setCalculationHistory(history);
      } catch (error) {
        console.warn("Failed to parse calculation history:", error);
      }
    }
  }, []);

  // tRPC query for dosage calculation
  const dosageCalculationQuery = trpc.dosage.calculate.useQuery(
    {
      medicationId: watchedValues.medicationId,
      animal: {
        species:
          animals.find((a) => a.id === watchedValues.animalId)?.species || "",
        weight: watchedValues.weight,
        weightUnit: watchedValues.weightUnit,
      },
      route: watchedValues.route,
      targetUnit: watchedValues.targetUnit,
    },
    {
      enabled: !!(
        watchedValues.animalId &&
        watchedValues.medicationId &&
        watchedValues.weight > 0 &&
        animals.find((a) => a.id === watchedValues.animalId)
      ),
      retry: false,
    },
  );

  // Update calculation result when query data changes
  useEffect(() => {
    setCalculationResult(dosageCalculationQuery.data || null);
    setIsCalculating(dosageCalculationQuery.isLoading);
  }, [dosageCalculationQuery.data, dosageCalculationQuery.isLoading]);

  // The calculation is now handled automatically by tRPC query above

  // Save calculation to history
  const saveCalculation = useCallback(() => {
    if (!calculationResult || !selectedMedication) return;

    const selectedAnimalData = animals.find(
      (a) => a.id === watchedValues.animalId,
    );
    if (!selectedAnimalData) return;

    const historyItem: CalculationHistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      animalName: selectedAnimalData.name,
      medicationName:
        selectedMedication.genericName +
        (selectedMedication.brandName
          ? ` (${selectedMedication.brandName})`
          : ""),
      weight: watchedValues.weight,
      weightUnit: watchedValues.weightUnit,
      dose: calculationResult.dose,
      unit: calculationResult.unit,
      safetyLevel: calculationResult.safetyLevel,
      route: watchedValues.route,
    };

    const newHistory = [historyItem, ...calculationHistory.slice(0, 19)]; // Keep last 20
    setCalculationHistory(newHistory);
    localStorage.setItem(
      "dosage-calculation-history",
      JSON.stringify(newHistory),
    );

    toast({
      title: "Calculation Saved",
      description: "Added to calculation history",
      duration: 2000,
    });
  }, [
    calculationResult,
    selectedMedication,
    animals,
    watchedValues,
    calculationHistory,
    toast,
  ]);

  // Reset form
  const resetCalculator = useCallback(() => {
    reset();
    setCalculationResult(null);
    setSelectedMedication(null);
  }, [reset]);

  // Print calculation
  const printCalculation = useCallback(() => {
    if (!calculationResult || !selectedMedication) return;

    const selectedAnimalData = animals.find(
      (a) => a.id === watchedValues.animalId,
    );
    if (!selectedAnimalData) return;

    // Create printable content
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const safetyConfig = SAFETY_CONFIG[calculationResult.safetyLevel];

    const printContent = `
      <html>
        <head>
          <title>Dosage Calculation - ${selectedAnimalData.name}</title>
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
            <p><strong>Animal:</strong> ${selectedAnimalData.name} (${selectedAnimalData.species})</p>
            <p><strong>Weight:</strong> ${watchedValues.weight} ${watchedValues.weightUnit}</p>
          </div>
          
          <div class="details">
            <h2>Medication</h2>
            <p><strong>Name:</strong> ${selectedMedication.genericName}${selectedMedication.brandName ? ` (${selectedMedication.brandName})` : ""}</p>
            <p><strong>Route:</strong> ${watchedValues.route || "Not specified"}</p>
          </div>
          
          <div class="result">
            <h2>Calculated Dose</h2>
            <div class="dose">${calculationResult.dose} ${calculationResult.unit}</div>
            <p><strong>Safety Level:</strong> <span class="warning">${safetyConfig.label}</span></p>
            <p><strong>Range:</strong> ${calculationResult.minDose} - ${calculationResult.maxDose} ${calculationResult.unit}</p>
          </div>
          
          ${
            calculationResult.warnings.length > 0
              ? `
            <div class="details">
              <h3>Warnings</h3>
              <ul>
                ${calculationResult.warnings.map((warning) => `<li class="warning">${warning}</li>`).join("")}
              </ul>
            </div>
          `
              : ""
          }
          
          <div class="details">
            <h3>Calculation Details</h3>
            <p><strong>Method:</strong> ${calculationResult.calculationMethod}</p>
            <p><strong>Base dose:</strong> ${calculationResult.baseDoseMgKg} mg/kg</p>
            <p><strong>Final dose:</strong> ${calculationResult.finalDoseMgKg} mg/kg</p>
            ${
              calculationResult.appliedAdjustments.length > 0
                ? `
              <p><strong>Adjustments:</strong> ${calculationResult.appliedAdjustments.join(", ")}</p>
            `
                : ""
            }
          </div>
          
          <script>window.print();</script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }, [calculationResult, selectedMedication, animals, watchedValues]);

  // Render safety indicator
  const renderSafetyIndicator = useMemo(() => {
    if (!calculationResult) return null;

    const config = SAFETY_CONFIG[calculationResult.safetyLevel];
    const percentage = Math.min(
      100,
      ((calculationResult.dose - calculationResult.minDose) /
        (calculationResult.maxDose - calculationResult.minDose)) *
        100,
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div
              className="flex h-4 w-4 items-center justify-center rounded-full font-bold text-white text-xs"
              style={{ backgroundColor: config.color }}
            >
              {config.icon}
            </div>
            {config.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: config.bgColor }}
          >
            <div
              className="font-bold text-2xl"
              style={{ color: config.textColor }}
            >
              {calculationResult.dose} {calculationResult.unit}
            </div>
            <div className="mt-1 text-muted-foreground text-sm">
              Calculated dose
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                Min: {calculationResult.minDose} {calculationResult.unit}
              </span>
              <span>
                Max: {calculationResult.maxDose} {calculationResult.unit}
              </span>
            </div>
            <div className="relative">
              <Progress
                value={percentage}
                className="h-3"
                style={{
                  backgroundColor: config.bgColor,
                }}
              />
              <div
                className="absolute top-0 left-0 h-3 rounded-full transition-all"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: config.color,
                }}
              />
            </div>
          </div>

          {calculationResult.alternativeFormats &&
            calculationResult.alternativeFormats.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div className="font-medium text-sm">Alternative Formats:</div>
                {calculationResult.alternativeFormats.map((format) => (
                  <div
                    key={`${format.dose}-${format.unit}`}
                    className="text-muted-foreground text-sm"
                  >
                    {format.dose} {format.unit} - {format.description}
                  </div>
                ))}
              </div>
            )}
        </CardContent>
      </Card>
    );
  }, [calculationResult]);

  return (
    <div className="container mx-auto max-w-6xl p-4">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <h1 className="font-bold text-2xl">Dosage Calculator</h1>
        </div>
        <p className="text-muted-foreground">
          Calculate safe medication dosages with real-time safety validation
        </p>
      </div>

      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="history">
            History ({calculationHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Input Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Calculation Inputs</CardTitle>
                  <CardDescription>
                    Enter patient and medication details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form className="space-y-4">
                      {/* Animal Selection */}
                      <FormField
                        control={form.control as any}
                        name="animalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Animal</FormLabel>
                            <FormControl>
                              <Select
                                value={String(field.value)}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select animal" />
                                </SelectTrigger>
                                <SelectContent>
                                  {animals.map((animal) => (
                                    <SelectItem
                                      key={animal.id}
                                      value={animal.id}
                                    >
                                      {animal.name} ({animal.species})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Weight Input */}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control as any}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="0.0"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control as any}
                          name="weightUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl>
                                <Select
                                  value={String(field.value)}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="kg">kg</SelectItem>
                                    <SelectItem value="lbs">lbs</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Medication Selection */}
                      <FormField
                        control={form.control as any}
                        name="medicationId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medication</FormLabel>
                            <FormControl>
                              <MedicationSearch
                                value={String(field.value || "")}
                                onChange={(medicationId, medication) => {
                                  field.onChange(medicationId);
                                  setSelectedMedication({
                                    genericName: medication.genericName,
                                    brandName: medication.brandName,
                                  });
                                }}
                                householdId={selectedHousehold?.id}
                                placeholder="Search medications..."
                                required
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Route Selection */}
                      <FormField
                        control={form.control as any}
                        name="route"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Route (Optional)</FormLabel>
                            <FormControl>
                              <Select
                                value={String(field.value || "")}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select route" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ADMINISTRATION_ROUTES.map((route) => (
                                    <SelectItem
                                      key={route.value}
                                      value={route.value}
                                    >
                                      {route.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Target Unit Selection */}
                      <FormField
                        control={form.control as any}
                        name="targetUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Unit</FormLabel>
                            <FormControl>
                              <Select
                                value={String(field.value)}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mg">mg</SelectItem>
                                  <SelectItem value="ml">ml</SelectItem>
                                  <SelectItem value="tablets">
                                    tablets
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Custom Adjustments */}
                      <FormField
                        control={form.control as any}
                        name="customAdjustment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Additional considerations or notes..."
                                className="resize-none"
                                rows={3}
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={resetCalculator} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>

                {calculationResult && (
                  <>
                    <Button
                      onClick={saveCalculation}
                      variant="outline"
                      size="sm"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>

                    <Button
                      onClick={printCalculation}
                      variant="outline"
                      size="sm"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Results and Safety Information */}
            <div className="space-y-6">
              {/* Real-time Calculation Display */}
              {isCalculating ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 animate-spin rounded-full border-primary border-b-2" />
                      <span>Calculating...</span>
                    </div>
                  </CardContent>
                </Card>
              ) : calculationResult ? (
                <>
                  {renderSafetyIndicator}

                  {/* Warnings and Safety Information */}
                  {calculationResult.warnings.length > 0 && (
                    <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                          <TrendingUp className="h-5 w-5" />
                          Safety Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {calculationResult.warnings.map((warning) => (
                            <li
                              key={warning}
                              className="text-sm text-yellow-700 dark:text-yellow-300"
                            >
                              • {warning}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Calculation Method Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Calculation Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Method</div>
                          <div className="text-muted-foreground capitalize">
                            {calculationResult.calculationMethod.replace(
                              "_",
                              " ",
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Base Dose</div>
                          <div className="text-muted-foreground">
                            {calculationResult.baseDoseMgKg} mg/kg
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Final Dose</div>
                          <div className="text-muted-foreground">
                            {calculationResult.finalDoseMgKg} mg/kg
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Weight Used</div>
                          <div className="text-muted-foreground">
                            {calculationResult.weightInKg} kg
                          </div>
                        </div>
                      </div>

                      {calculationResult.appliedAdjustments.length > 0 && (
                        <div>
                          <div className="mb-1 font-medium text-sm">
                            Applied Adjustments
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {calculationResult.appliedAdjustments.join(", ")}
                          </div>
                        </div>
                      )}

                      {calculationResult.dailyInfo && <Separator />}

                      {calculationResult.dailyInfo && (
                        <div className="space-y-2">
                          <div className="font-medium text-sm">
                            Daily Dosing Information
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="font-medium">Total Daily</div>
                              <div className="text-muted-foreground">
                                {calculationResult.dailyInfo.totalDailyDose}{" "}
                                {calculationResult.unit}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium">Doses/Day</div>
                              <div className="text-muted-foreground">
                                {calculationResult.dailyInfo.dosesPerDay}
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="font-medium text-sm">Interval</div>
                            <div className="text-muted-foreground text-sm">
                              {calculationResult.dailyInfo.timeBetweenDoses}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Calculator className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 font-medium text-lg">
                      Ready to Calculate
                    </h3>
                    <p className="text-muted-foreground">
                      Fill in the animal, medication, and weight to see
                      real-time dosage calculations
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Calculation History
              </CardTitle>
              <CardDescription>
                Recent dosage calculations (coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  History feature coming soon
                </p>
                <p className="text-muted-foreground text-sm">
                  Your calculations will be saved here for easy reference
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
