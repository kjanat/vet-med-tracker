/**
 * Regimen factory for test data generation
 */

import type { NewRegimen } from "@/db/schema";
import { dates, times } from "./utils/dates";
import { random } from "./utils/random";

// Regimen factory function
export function createRegimen(overrides: Partial<NewRegimen> = {}): NewRegimen {
  const scheduleType = random.arrayElement([
    "FIXED",
    "INTERVAL",
    "PRN",
    "TAPER",
  ]);
  const intervalHours =
    scheduleType === "INTERVAL" ? random.arrayElement([8, 12, 24]) : null;
  const timesLocal =
    scheduleType === "FIXED"
      ? generateMedicationTimes(intervalHours || 12)
      : null;
  const startDate = dates.dateRecent(random.int(1, 30));
  const endDate = random.boolean(0.7)
    ? dates.daysFromNow(random.int(7, 90))
    : null;

  return {
    id: random.uuid(),
    animalId: random.uuid(), // Should be overridden with actual animal ID
    medicationId: random.uuid(), // Should be overridden with actual medication ID
    name: generateRegimenName(),
    instructions: generateInstructions(scheduleType),
    scheduleType: scheduleType as any,
    timesLocal: timesLocal,
    intervalHours: intervalHours,
    startDate: dates.toDateString(startDate) as string,
    endDate: endDate ? dates.toDateString(endDate) : null,
    prnReason: scheduleType === "PRN" ? generatePrnReason() : null,
    maxDailyDoses: scheduleType === "PRN" ? random.int(2, 6) : null,
    cutoffMinutes: random.arrayElement([120, 240, 360, 480]), // 2-8 hour window
    highRisk: random.boolean(0.1), // 10% are high risk
    requiresCoSign: random.boolean(0.05), // 5% require co-sign
    active: random.boolean(0.9), // 90% are active
    pausedAt: random.boolean(0.05) ? dates.dateRecent(7).toISOString() : null,
    pauseReason: random.boolean(0.05) ? generatePauseReason() : null,
    dose: generateDoseString(),
    route: random.arrayElement(["ORAL", "SC", "IM", "IV", "TOPICAL"]),
    createdAt: dates.datePast(60).toISOString(),
    updatedAt: dates.dateRecent(7).toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

// Helper functions for generating regimen-specific data
function generateMedicationTimes(intervalHours: number): string[] {
  switch (intervalHours) {
    case 8:
      return times.tid(); // Three times daily
    case 12:
      return times.bid(); // Twice daily
    case 24:
      return [times.morning]; // Once daily
    default:
      return times.bid();
  }
}

function generateRegimenName(): string | null {
  if (!random.boolean(0.6)) return null; // 60% chance of having a custom name

  const names = [
    "Post-surgery antibiotics",
    "Arthritis management",
    "Anxiety medication",
    "Pain relief",
    "Heartworm prevention",
    "Allergy treatment",
    "Diabetes management",
    "Seizure control",
    "Heart medication",
    "Skin condition treatment",
  ];

  return random.arrayElement(names);
}

function generateInstructions(scheduleType: string): string {
  const instructionsByType: Record<string, string[]> = {
    FIXED: [
      "Give with food to prevent stomach upset",
      "Administer at the same times each day",
      "Do not skip doses",
      "Complete the full course even if symptoms improve",
      "Give with small amount of food",
    ],
    INTERVAL: [
      "Give at scheduled intervals", // Changed from template syntax to avoid Biome lint error
      "May give with or without food",
      "Space doses evenly throughout the day",
      "Set reminders to maintain consistent timing",
    ],
    PRN: [
      "Give as needed for symptoms",
      "Do not exceed maximum daily dose",
      "Wait at least 4 hours between doses",
      "Monitor for effectiveness and side effects",
      "Contact vet if no improvement after 48 hours",
    ],
    TAPER: [
      "Follow tapering schedule exactly",
      "Do not stop abruptly",
      "Reduce dose gradually as directed",
      "Monitor for withdrawal symptoms",
    ],
  };

  const instructions = instructionsByType[scheduleType];
  if (!instructions) {
    const fixedInstructions = instructionsByType.FIXED;
    return fixedInstructions
      ? random.arrayElement(fixedInstructions)
      : "Follow medication instructions";
  }
  return random.arrayElement(instructions);
}

function generatePrnReason(): string {
  const reasons = [
    "Pain management",
    "Anxiety episodes",
    "Seizure activity",
    "Nausea/vomiting",
    "Allergic reactions",
    "Respiratory distress",
    "Muscle spasms",
    "Digestive upset",
  ];

  return random.arrayElement(reasons);
}

function generatePauseReason(): string {
  const reasons = [
    "Vacation - temporary pause",
    "Side effects observed",
    "Veterinarian recommendation",
    "Drug interaction concerns",
    "Surgery scheduled",
    "Lab results pending",
  ];

  return random.arrayElement(reasons);
}

function generateDoseString(): string {
  const amount = random.float(0.1, 50, 1);
  const unit = random.arrayElement([
    "mg",
    "mL",
    "tablets",
    "capsules",
    "drops",
    "units",
  ]);

  // Special formatting for tablets/capsules
  if (["tablets", "capsules"].includes(unit)) {
    const wholeNumber = Math.floor(amount);
    const fraction = amount - wholeNumber;

    if (fraction === 0.5) {
      return wholeNumber > 0 ? `${wholeNumber} 1/2 ${unit}` : `1/2 ${unit}`;
    } else if (fraction === 0.25) {
      return wholeNumber > 0 ? `${wholeNumber} 1/4 ${unit}` : `1/4 ${unit}`;
    } else if (fraction === 0.75) {
      return wholeNumber > 0 ? `${wholeNumber} 3/4 ${unit}` : `3/4 ${unit}`;
    } else {
      return `${Math.ceil(amount)} ${unit}`;
    }
  }

  return `${amount} ${unit}`;
}

// Regimen builder class for complex scenarios
export class RegimenBuilder {
  private regimen: Partial<NewRegimen> = {};

  static create(): RegimenBuilder {
    return new RegimenBuilder();
  }

  forAnimal(animalId: string): RegimenBuilder {
    this.regimen.animalId = animalId;
    return this;
  }

  withMedication(medicationId: string): RegimenBuilder {
    this.regimen.medicationId = medicationId;
    return this;
  }

  withName(name: string): RegimenBuilder {
    this.regimen.name = name;
    return this;
  }

  withFixedSchedule(timesLocal: string[]): RegimenBuilder {
    this.regimen.scheduleType = "FIXED";
    this.regimen.timesLocal = timesLocal;
    this.regimen.intervalHours = null;
    return this;
  }

  withIntervalSchedule(hours: number): RegimenBuilder {
    this.regimen.scheduleType = "INTERVAL";
    this.regimen.intervalHours = hours;
    this.regimen.timesLocal = null;
    return this;
  }

  withPrnSchedule(reason: string, maxDailyDoses: number): RegimenBuilder {
    this.regimen.scheduleType = "PRN";
    this.regimen.prnReason = reason;
    this.regimen.maxDailyDoses = maxDailyDoses;
    this.regimen.timesLocal = null;
    this.regimen.intervalHours = null;
    return this;
  }

  withTaperSchedule(): RegimenBuilder {
    this.regimen.scheduleType = "TAPER";
    this.regimen.timesLocal = null;
    this.regimen.intervalHours = null;
    return this;
  }

  withDuration(startDate: Date, endDate?: Date): RegimenBuilder {
    this.regimen.startDate = dates.toDateString(startDate);
    this.regimen.endDate = endDate ? dates.toDateString(endDate) : null;
    return this;
  }

  withDose(dose: string): RegimenBuilder {
    this.regimen.dose = dose;
    return this;
  }

  withRoute(route: string): RegimenBuilder {
    this.regimen.route = route;
    return this;
  }

  withInstructions(instructions: string): RegimenBuilder {
    this.regimen.instructions = instructions;
    return this;
  }

  withCutoffWindow(minutes: number): RegimenBuilder {
    this.regimen.cutoffMinutes = minutes;
    return this;
  }

  isHighRisk(highRisk = true): RegimenBuilder {
    this.regimen.highRisk = highRisk;
    return this;
  }

  requiresCoSign(requires = true): RegimenBuilder {
    this.regimen.requiresCoSign = requires;
    return this;
  }

  isPaused(reason?: string): RegimenBuilder {
    this.regimen.active = false;
    this.regimen.pausedAt = dates.dateRecent(1).toISOString();
    this.regimen.pauseReason = reason || "Temporarily paused";
    return this;
  }

  isActive(active = true): RegimenBuilder {
    this.regimen.active = active;
    if (active) {
      this.regimen.pausedAt = null;
      this.regimen.pauseReason = null;
    }
    return this;
  }

  createdDaysAgo(days: number): RegimenBuilder {
    this.regimen.createdAt = dates.daysFromNow(-days).toISOString();
    this.regimen.updatedAt = dates.dateRecent(Math.min(days, 7)).toISOString();
    return this;
  }

  build(): NewRegimen {
    return createRegimen(this.regimen);
  }
}

// Preset regimen types for common scenarios
export const regimenPresets = {
  twiceDailyOral: (animalId: string, medicationId: string): NewRegimen =>
    RegimenBuilder.create()
      .forAnimal(animalId)
      .withMedication(medicationId)
      .withFixedSchedule(times.bid())
      .withDose("250 mg")
      .withRoute("ORAL")
      .withInstructions("Give with food to prevent stomach upset")
      .withDuration(dates.yesterday(), dates.weeksFromNow(2))
      .createdDaysAgo(1)
      .build(),

  onceDailyHeartWorm: (animalId: string, medicationId: string): NewRegimen =>
    RegimenBuilder.create()
      .forAnimal(animalId)
      .withMedication(medicationId)
      .withFixedSchedule([times.morning])
      .withName("Heartworm prevention")
      .withDose("1 tablet")
      .withRoute("ORAL")
      .withInstructions("Give on the same date each month with food")
      .withDuration(dates.daysFromNow(-30), dates.monthsFromNow(12))
      .createdDaysAgo(30)
      .build(),

  painReliefPrn: (animalId: string, medicationId: string): NewRegimen =>
    RegimenBuilder.create()
      .forAnimal(animalId)
      .withMedication(medicationId)
      .withPrnSchedule("Pain management", 3)
      .withName("Pain relief as needed")
      .withDose("50 mg")
      .withRoute("ORAL")
      .withInstructions(
        "Give as needed for pain. Do not exceed 3 doses per day.",
      )
      .withCutoffWindow(240) // 4 hour window
      .withDuration(dates.yesterday(), dates.weeksFromNow(4))
      .createdDaysAgo(1)
      .build(),

  antibioticCourse: (animalId: string, medicationId: string): NewRegimen =>
    RegimenBuilder.create()
      .forAnimal(animalId)
      .withMedication(medicationId)
      .withFixedSchedule(times.tid())
      .withName("Post-surgery antibiotics")
      .withDose("500 mg")
      .withRoute("ORAL")
      .withInstructions(
        "Complete full course even if symptoms improve. Give with food.",
      )
      .withDuration(dates.yesterday(), dates.weeksFromNow(2))
      .createdDaysAgo(1)
      .build(),

  anxietyMedication: (animalId: string, medicationId: string): NewRegimen =>
    RegimenBuilder.create()
      .forAnimal(animalId)
      .withMedication(medicationId)
      .withPrnSchedule("Anxiety episodes", 2)
      .withName("Anxiety management")
      .withDose("25 mg")
      .withRoute("ORAL")
      .withInstructions("Give 30-60 minutes before stressful events")
      .withDuration(dates.weeksFromNow(-2), dates.monthsFromNow(6))
      .createdDaysAgo(14)
      .build(),

  steroidTaper: (animalId: string, medicationId: string): NewRegimen =>
    RegimenBuilder.create()
      .forAnimal(animalId)
      .withMedication(medicationId)
      .withTaperSchedule()
      .withName("Steroid taper")
      .withDose("10 mg")
      .withRoute("ORAL")
      .withInstructions(
        "Follow tapering schedule exactly. Do not stop abruptly.",
      )
      .withDuration(dates.yesterday(), dates.weeksFromNow(6))
      .isHighRisk(true)
      .createdDaysAgo(1)
      .build(),

  highRiskMedication: (animalId: string, medicationId: string): NewRegimen =>
    RegimenBuilder.create()
      .forAnimal(animalId)
      .withMedication(medicationId)
      .withFixedSchedule(times.bid())
      .withName("Chemotherapy protocol")
      .withDose("20 mg/m²")
      .withRoute("IV")
      .withInstructions(
        "Requires veterinary supervision. Monitor for adverse effects.",
      )
      .withDuration(dates.yesterday(), dates.weeksFromNow(12))
      .isHighRisk(true)
      .requiresCoSign(true)
      .createdDaysAgo(1)
      .build(),

  pausedRegimen: (animalId: string, medicationId: string): NewRegimen =>
    RegimenBuilder.create()
      .forAnimal(animalId)
      .withMedication(medicationId)
      .withFixedSchedule(times.bid())
      .withDose("100 mg")
      .withRoute("ORAL")
      .withDuration(dates.weeksFromNow(-1), dates.weeksFromNow(2))
      .isPaused("Vacation - temporary pause")
      .createdDaysAgo(7)
      .build(),
};
