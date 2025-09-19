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
import type { DosageResult } from "@/lib/schemas/dosage";
import * as DosageFormatService from "@/lib/services/dosage-format.service";
import {
  addCalculation,
  type CalculationHistoryItem,
  createHistoryItem,
  loadHistory,
} from "@/lib/services/dosage-history.service";
import { openPrintWindow } from "@/lib/services/dosage-print.service";
import {
  ADMINISTRATION_ROUTES,
  canCalculate,
  type DosageCalculatorForm,
  dosageCalculatorSchema,
  getDefaultValues,
} from "@/lib/services/dosage-validation.service";
import { trpc } from "@/server/trpc/client";

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
    defaultValues: getDefaultValues(selectedAnimal?.id),
    resolver: zodResolver(dosageCalculatorSchema),
  });

  const { watch, setValue, reset } = form;
  const watchedValues = watch();

  // Auto-select animal when changed
  useEffect(() => {
    if (selectedAnimal?.id && watchedValues.animalId !== selectedAnimal.id) {
      setValue("animalId", selectedAnimal.id);
    }
  }, [selectedAnimal, setValue, watchedValues.animalId]);

  // Load calculation history on mount
  useEffect(() => {
    const history = loadHistory();
    setCalculationHistory(history);
  }, []);

  // tRPC query for dosage calculation
  const dosageCalculationQuery = trpc.dosage.calculate.useQuery(
    {
      animal: {
        species:
          animals.find((a) => a.id === watchedValues.animalId)?.species || "",
        weight: watchedValues.weight,
        weightUnit: watchedValues.weightUnit,
      },
      medicationId: watchedValues.medicationId,
      route: watchedValues.route,
      targetUnit: watchedValues.targetUnit,
    },
    {
      enabled: canCalculate(
        watchedValues.animalId,
        watchedValues.medicationId,
        watchedValues.weight,
        animals,
      ),
      retry: false,
    },
  );

  // Update calculation result when query data changes
  useEffect(() => {
    setCalculationResult(dosageCalculationQuery.data || null);
    setIsCalculating(dosageCalculationQuery.isLoading);
  }, [dosageCalculationQuery.data, dosageCalculationQuery.isLoading]);

  // Save calculation to history
  const saveCalculation = useCallback(() => {
    if (!calculationResult || !selectedMedication) return;

    const selectedAnimalData = animals.find(
      (a) => a.id === watchedValues.animalId,
    );
    if (!selectedAnimalData) return;

    const medicationName = DosageFormatService.formatMedicationName(
      selectedMedication.genericName,
      selectedMedication.brandName,
    );

    const historyItem = createHistoryItem(
      selectedAnimalData.name,
      medicationName,
      calculationResult.dose,
      calculationResult.unit,
      calculationResult.safetyLevel,
      watchedValues.weight,
      watchedValues.weightUnit,
      watchedValues.route,
    );

    const newHistory = addCalculation(calculationHistory, historyItem);
    setCalculationHistory(newHistory);

    toast({
      description: "Added to calculation history",
      duration: 2000,
      title: "Calculation Saved",
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
    reset(getDefaultValues(selectedAnimal?.id));
    setCalculationResult(null);
    setSelectedMedication(null);
  }, [reset, selectedAnimal?.id]);

  // Print calculation
  const printCalculation = useCallback(() => {
    if (!calculationResult || !selectedMedication) return;

    const selectedAnimalData = animals.find(
      (a) => a.id === watchedValues.animalId,
    );
    if (!selectedAnimalData) return;

    const success = openPrintWindow({
      animalName: selectedAnimalData.name,
      animalSpecies: selectedAnimalData.species,
      brandName: selectedMedication.brandName,
      calculationResult,
      medicationName: selectedMedication.genericName,
      route: watchedValues.route,
      weight: watchedValues.weight,
      weightUnit: watchedValues.weightUnit,
    });

    if (!success) {
      toast({
        description:
          "Could not open print window. Please check your popup blocker.",
        title: "Print Failed",
        variant: "destructive",
      });
    }
  }, [calculationResult, selectedMedication, animals, watchedValues, toast]);

  // Render safety indicator
  const renderSafetyIndicator = useMemo(() => {
    if (!DosageFormatService.isValidCalculationResult(calculationResult)) {
      return null;
    }

    const safetyData =
      DosageFormatService.prepareSafetyIndicatorData(calculationResult);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div
              className="flex h-4 w-4 items-center justify-center rounded-full font-bold text-white text-xs"
              style={{ backgroundColor: safetyData.config.color }}
            >
              {safetyData.config.icon}
            </div>
            {safetyData.config.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: safetyData.config.bgColor }}
          >
            <div
              className="font-bold text-2xl"
              style={{ color: safetyData.config.textColor }}
            >
              {safetyData.dose} {safetyData.unit}
            </div>
            <div className="mt-1 text-muted-foreground text-sm">
              Calculated dose
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                Min: {safetyData.minDose} {safetyData.unit}
              </span>
              <span>
                Max: {safetyData.maxDose} {safetyData.unit}
              </span>
            </div>
            <div className="relative">
              <Progress
                className="h-3"
                style={{ backgroundColor: safetyData.config.bgColor }}
                value={safetyData.percentage}
              />
              <div
                className="absolute top-0 left-0 h-3 rounded-full transition-all"
                style={{
                  backgroundColor: safetyData.config.color,
                  width: `${safetyData.percentage}%`,
                }}
              />
            </div>
          </div>

          {safetyData.alternativeFormats.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <div className="font-medium text-sm">Alternative Formats:</div>
              {safetyData.alternativeFormats.map((format) => (
                <div
                  className="text-muted-foreground text-sm"
                  key={`${format.dose}-${format.unit}`}
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

      <Tabs className="w-full" defaultValue="calculator">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="history">
            History ({calculationHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="calculator">
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
                        control={form.control}
                        name="animalId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Animal</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={String(field.value)}
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
                          control={form.control}
                          name="weight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight</FormLabel>
                              <FormControl>
                                <Input
                                  min="0"
                                  placeholder="0.0"
                                  step="0.1"
                                  type="number"
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
                          control={form.control}
                          name="weightUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <FormControl>
                                <Select
                                  onValueChange={field.onChange}
                                  value={String(field.value)}
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
                        control={form.control}
                        name="medicationId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Medication</FormLabel>
                            <FormControl>
                              <MedicationSearch
                                householdId={selectedHousehold?.id}
                                onChange={(medicationId, medication) => {
                                  field.onChange(medicationId);
                                  setSelectedMedication({
                                    brandName: medication.brandName,
                                    genericName: medication.genericName,
                                  });
                                }}
                                placeholder="Search medications..."
                                required
                                value={String(field.value || "")}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Route Selection */}
                      <FormField
                        control={form.control}
                        name="route"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Route (Optional)</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={String(field.value || "")}
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
                        control={form.control}
                        name="targetUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Unit</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={field.onChange}
                                value={String(field.value)}
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
                        control={form.control}
                        name="customAdjustment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                className="resize-none"
                                placeholder="Additional considerations or notes..."
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
                <Button onClick={resetCalculator} size="sm" variant="outline">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>

                {calculationResult && (
                  <>
                    <Button
                      onClick={saveCalculation}
                      size="sm"
                      variant="outline"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </Button>

                    <Button
                      onClick={printCalculation}
                      size="sm"
                      variant="outline"
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
                    <Card
                      className={`${DosageFormatService.getSafetyClasses("caution").border} ${DosageFormatService.getSafetyClasses("caution").background}`}
                    >
                      <CardHeader>
                        <CardTitle
                          className={`flex items-center gap-2 ${DosageFormatService.getSafetyClasses("caution").text}`}
                        >
                          <TrendingUp className="h-5 w-5" />
                          Safety Warnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {calculationResult.warnings.map((warning) => (
                            <li
                              className={`text-sm ${DosageFormatService.getSafetyClasses("caution").text}`}
                              key={warning}
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
                          <div className="text-muted-foreground">
                            {DosageFormatService.formatCalculationMethod(
                              calculationResult.calculationMethod,
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
                            {DosageFormatService.formatAdjustments(
                              calculationResult.appliedAdjustments,
                            )}
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

        <TabsContent className="space-y-6" value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Calculation History
              </CardTitle>
              <CardDescription>
                Recent dosage calculations ({calculationHistory.length} saved)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calculationHistory.length > 0 ? (
                <div className="space-y-4">
                  {calculationHistory.map((item) => (
                    <div
                      className="flex items-center justify-between rounded-lg border p-4"
                      key={item.id}
                    >
                      <div className="space-y-1">
                        <div className="font-medium">
                          {item.animalName} - {item.medicationName}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {DosageFormatService.formatDose(item.dose, item.unit)}{" "}
                          •{" "}
                          {DosageFormatService.formatWeight(
                            item.weight,
                            item.weightUnit,
                          )}{" "}
                          • {DosageFormatService.formatRoute(item.route)} •{" "}
                          {item.timestamp.toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        className={`rounded-full px-2 py-1 font-medium text-xs ${DosageFormatService.getSafetyClasses(item.safetyLevel).background} ${DosageFormatService.getSafetyClasses(item.safetyLevel).text}`}
                      >
                        {
                          DosageFormatService.getSafetyConfig(item.safetyLevel)
                            .label
                        }
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No calculations saved yet
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Your calculations will be saved here for easy reference
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
