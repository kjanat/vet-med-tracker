/**
 * Administration factory for test data generation
 */

import type { NewAdministration } from "@/db/schema";
import { dates } from "./utils/dates";
import { administration } from "./utils/medical";
import { random } from "./utils/random";

// Administration factory function
export function createAdministration(
  overrides: Partial<NewAdministration> = {},
): NewAdministration {
  const status = administration.getRandomStatus();
  const scheduledFor = dates.dateRecent(7);
  const recordedAt = generateRecordedAt(scheduledFor, status);
  const dose = generateDoseString();

  return {
    id: random.uuid(),
    regimenId: random.uuid(), // Should be overridden with actual regimen ID
    animalId: random.uuid(), // Should be overridden with actual animal ID
    householdId: random.uuid(), // Should be overridden with actual household ID
    caregiverId: random.uuid(), // Should be overridden with actual caregiver ID
    scheduledFor: scheduledFor.toISOString(),
    recordedAt: recordedAt.toISOString(),
    status: status as "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED" | "PRN",
    sourceItemId: random.boolean(0.6) ? random.uuid() : null, // 60% linked to inventory
    site: generateSite(
      overrides.route ||
        random.arrayElement(["ORAL", "SC", "IM", "IV", "TOPICAL"]),
    ),
    dose: dose,
    notes: administration.generateNotes(status),
    mediaUrls: random.boolean(0.1) ? generateMediaUrls() : [], // 10% have photos
    coSignUserId: random.boolean(0.05) ? random.uuid() : null, // 5% require co-sign
    coSignedAt: random.boolean(0.05) ? dates.dateRecent(1).toISOString() : null,
    coSignNotes: random.boolean(0.05) ? "Verified administration" : null,
    adverseEvent: random.boolean(0.02), // 2% adverse events
    adverseEventDescription: random.boolean(0.02)
      ? generateAdverseEventDescription()
      : null,
    idempotencyKey: `admin_${random.alphaNumeric(16)}`,
    createdAt: recordedAt.toISOString(),
    updatedAt: recordedAt.toISOString(),
    ...overrides,
  };
}

// Helper functions for administration-specific data
function generateRecordedAt(scheduledFor: Date, status: string): Date {
  const scheduledTime = scheduledFor.getTime();

  switch (status) {
    case "ON_TIME":
      // Within 15 minutes of scheduled time
      return new Date(scheduledTime + random.int(-15, 15) * 60 * 1000);

    case "LATE":
      // 16 minutes to 2 hours late
      return new Date(scheduledTime + random.int(16, 120) * 60 * 1000);

    case "VERY_LATE":
      // 2+ hours late
      return new Date(scheduledTime + random.int(121, 480) * 60 * 1000);

    case "MISSED":
      // Recorded as missed hours or days later
      return new Date(scheduledTime + random.int(240, 2880) * 60 * 1000);

    case "PRN":
      // PRN can be given any time within range
      return new Date(scheduledTime + random.int(-60, 300) * 60 * 1000);

    default:
      return new Date(scheduledTime);
  }
}

function generateSite(route: string): string | null {
  if (!["SC", "IM", "IV"].includes(route)) return null;

  const sites: Record<string, string[]> = {
    SC: [
      "Left shoulder",
      "Right shoulder",
      "Scruff of neck",
      "Left flank",
      "Right flank",
    ],
    IM: ["Left thigh", "Right thigh", "Left shoulder", "Right shoulder"],
    IV: [
      "Left cephalic vein",
      "Right cephalic vein",
      "Jugular vein",
      "Saphenous vein",
    ],
  };

  return random.arrayElement(sites[route] || sites.SC);
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
    "IU",
  ]);

  if (["tablets", "capsules"].includes(unit)) {
    const wholeNumber = Math.floor(amount);
    const fraction = amount - wholeNumber;

    if (fraction === 0.5) {
      return wholeNumber > 0 ? `${wholeNumber} 1/2 ${unit}` : `1/2 ${unit}`;
    } else if (fraction === 0.25) {
      return wholeNumber > 0 ? `${wholeNumber} 1/4 ${unit}` : `1/4 ${unit}`;
    } else {
      return `${Math.ceil(amount)} ${unit}`;
    }
  }

  return `${amount} ${unit}`;
}

function generateMediaUrls(): string[] {
  const count = random.int(1, 3);
  return Array.from(
    { length: count },
    (_, i) =>
      `https://test-photos.example.com/admin_${random.alphaNumeric(8)}_${i}.jpg`,
  );
}

function generateAdverseEventDescription(): string {
  const events = [
    "Pet vomited 10 minutes after administration",
    "Mild skin irritation at injection site",
    "Pet showed signs of lethargy after dose",
    "Temporary loss of appetite noted",
    "Pet had diarrhea 2 hours after medication",
    "Injection site showed mild swelling",
    "Pet appeared restless after administration",
    "Mild allergic reaction - hives observed",
  ];

  return random.arrayElement(events);
}

// Administration builder class for complex scenarios
export class AdministrationBuilder {
  private administration: Partial<NewAdministration> = {};

  static create(): AdministrationBuilder {
    return new AdministrationBuilder();
  }

  forRegimen(regimenId: string): AdministrationBuilder {
    this.administration.regimenId = regimenId;
    return this;
  }

  forAnimal(animalId: string): AdministrationBuilder {
    this.administration.animalId = animalId;
    return this;
  }

  inHousehold(householdId: string): AdministrationBuilder {
    this.administration.householdId = householdId;
    return this;
  }

  byCaregiver(caregiverId: string): AdministrationBuilder {
    this.administration.caregiverId = caregiverId;
    return this;
  }

  scheduledFor(scheduledTime: Date): AdministrationBuilder {
    this.administration.scheduledFor = scheduledTime.toISOString();
    return this;
  }

  withStatus(
    status: "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED" | "PRN",
  ): AdministrationBuilder {
    this.administration.status = status as any;
    return this;
  }

  recordedAt(recordedTime: Date): AdministrationBuilder {
    this.administration.recordedAt = recordedTime.toISOString();
    this.administration.createdAt = recordedTime.toISOString();
    this.administration.updatedAt = recordedTime.toISOString();
    return this;
  }

  withDose(dose: string): AdministrationBuilder {
    this.administration.dose = dose;
    return this;
  }

  atSite(site: string): AdministrationBuilder {
    this.administration.site = site;
    return this;
  }

  withNotes(notes: string): AdministrationBuilder {
    this.administration.notes = notes;
    return this;
  }

  fromInventory(inventoryItemId: string): AdministrationBuilder {
    this.administration.sourceItemId = inventoryItemId;
    return this;
  }

  withPhotos(urls: string[]): AdministrationBuilder {
    this.administration.mediaUrls = urls;
    return this;
  }

  requiresCoSign(coSignUserId?: string): AdministrationBuilder {
    this.administration.coSignUserId = coSignUserId || random.uuid();
    return this;
  }

  coSignedBy(coSignUserId: string, notes?: string): AdministrationBuilder {
    this.administration.coSignUserId = coSignUserId;
    this.administration.coSignedAt = dates.dateRecent(1).toISOString();
    this.administration.coSignNotes = notes || "Verified administration";
    return this;
  }

  withAdverseEvent(description: string): AdministrationBuilder {
    this.administration.adverseEvent = true;
    this.administration.adverseEventDescription = description;
    return this;
  }

  withIdempotencyKey(key: string): AdministrationBuilder {
    this.administration.idempotencyKey = key;
    return this;
  }

  build(): NewAdministration {
    return createAdministration(this.administration);
  }
}

// Preset administration types for common scenarios
export const administrationPresets = {
  onTimeOral: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
  ): NewAdministration => {
    const scheduledTime = dates.hoursFromNow(-2);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .scheduledFor(scheduledTime)
      .withStatus("ON_TIME")
      .recordedAt(new Date(scheduledTime.getTime() + 5 * 60 * 1000)) // 5 minutes after scheduled
      .withDose("250 mg")
      .withNotes("Given with breakfast as scheduled")
      .build();
  },

  lateWithExcuse: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
  ): NewAdministration => {
    const scheduledTime = dates.hoursFromNow(-3);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .scheduledFor(scheduledTime)
      .withStatus("LATE")
      .recordedAt(new Date(scheduledTime.getTime() + 45 * 60 * 1000)) // 45 minutes late
      .withDose("250 mg")
      .withNotes("Delayed due to appointment, gave as soon as I got home")
      .build();
  },

  missedDose: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
  ): NewAdministration => {
    const scheduledTime = dates.daysFromNow(-1);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .scheduledFor(scheduledTime)
      .withStatus("MISSED")
      .recordedAt(new Date(scheduledTime.getTime() + 6 * 60 * 60 * 1000)) // 6 hours later
      .withNotes("Pet refused to take medication despite multiple attempts")
      .build();
  },

  subcutaneousInjection: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
  ): NewAdministration => {
    const scheduledTime = dates.hoursFromNow(-1);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .scheduledFor(scheduledTime)
      .withStatus("ON_TIME")
      .recordedAt(scheduledTime)
      .withDose("0.5 mL")
      .atSite("Left shoulder")
      .withNotes("Injection given smoothly, no resistance from pet")
      .build();
  },

  prnPainRelief: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
  ): NewAdministration => {
    const recordedTime = dates.hoursFromNow(-1);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .withStatus("PRN")
      .recordedAt(recordedTime)
      .withDose("50 mg")
      .withNotes("Pet showing signs of discomfort after exercise")
      .build();
  },

  withAdverseEvent: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
  ): NewAdministration => {
    const scheduledTime = dates.hoursFromNow(-4);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .scheduledFor(scheduledTime)
      .withStatus("ON_TIME")
      .recordedAt(scheduledTime)
      .withDose("100 mg")
      .withNotes("Medication administered as scheduled")
      .withAdverseEvent("Pet vomited 15 minutes after administration")
      .build();
  },

  withCoSign: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
    coSignUserId: string,
  ): NewAdministration => {
    const scheduledTime = dates.hoursFromNow(-2);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .scheduledFor(scheduledTime)
      .withStatus("ON_TIME")
      .recordedAt(scheduledTime)
      .withDose("20 mg/m²")
      .coSignedBy(coSignUserId, "High-risk medication administration verified")
      .withNotes("Chemotherapy dose administered under veterinary supervision")
      .build();
  },

  withPhotos: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
  ): NewAdministration => {
    const scheduledTime = dates.hoursFromNow(-1);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .scheduledFor(scheduledTime)
      .withStatus("ON_TIME")
      .recordedAt(scheduledTime)
      .withDose("1 tablet")
      .withPhotos([
        "https://test-photos.example.com/admin_before_abc123.jpg",
        "https://test-photos.example.com/admin_after_abc123.jpg",
      ])
      .withNotes("Photos show successful tablet administration")
      .build();
  },

  fromInventory: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
    inventoryItemId: string,
  ): NewAdministration => {
    const scheduledTime = dates.hoursFromNow(-1);
    return AdministrationBuilder.create()
      .forRegimen(regimenId)
      .forAnimal(animalId)
      .inHousehold(householdId)
      .byCaregiver(caregiverId)
      .scheduledFor(scheduledTime)
      .withStatus("ON_TIME")
      .recordedAt(scheduledTime)
      .withDose("250 mg")
      .fromInventory(inventoryItemId)
      .withNotes("Dose tracked from household inventory")
      .build();
  },
};
