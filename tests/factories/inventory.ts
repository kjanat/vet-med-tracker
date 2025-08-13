/**
 * Inventory factory for test data generation
 */

import type { NewInventoryItem } from "@/db/schema";
import { dates } from "./utils/dates";
import { storage } from "./utils/medical";
import { random } from "./utils/random";

// Inventory factory function
export function createInventoryItem(
  overrides: Partial<NewInventoryItem> = {},
): NewInventoryItem {
  const quantityUnits = random.int(10, 100);
  const unitsRemaining = random.int(0, quantityUnits);
  const inUse = unitsRemaining > 0 && random.boolean(0.6);
  const purchaseDate = dates.purchaseDate(random.int(30, 180));
  const expiresOn = dates.expirationDate(random.int(6, 24));

  return {
    id: random.uuid(),
    householdId: random.uuid(), // Should be overridden with actual household ID
    medicationId: random.uuid(), // Should be overridden with actual medication ID
    assignedAnimalId: random.boolean(0.4) ? random.uuid() : null, // 40% assigned to specific animal
    brandOverride: random.boolean(0.3) ? generateBrandOverride() : null,
    concentration: generateConcentration(),
    lot: generateLotNumber(),
    expiresOn: dates.toDateString(expiresOn),
    storage: storage.getRandomStorage() as any,
    quantityUnits: quantityUnits,
    unitsRemaining: unitsRemaining,
    unitType: random.arrayElement([
      "tablets",
      "capsules",
      "mL",
      "doses",
      "syringes",
    ]),
    openedOn: inUse
      ? dates.toDateString(dates.dateRecent(random.int(1, 30)))
      : null,
    inUse: inUse,
    barcode: random.boolean(0.7) ? generateBarcode() : null,
    purchaseDate: dates.toDateString(purchaseDate),
    purchasePrice: random.boolean(0.8)
      ? random.float(10, 200, 2).toString()
      : null,
    supplier: random.boolean(0.8) ? generateSupplier() : null,
    notes: random.boolean(0.3) ? generateInventoryNotes() : null,
    createdAt: dates.datePast(180).toISOString(),
    updatedAt: dates.dateRecent(7).toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

// Helper functions for inventory-specific data
function generateBrandOverride(): string {
  const brands = [
    "Zoetis",
    "Merck Animal Health",
    "Elanco",
    "Boehringer Ingelheim",
    "Vetoquinol",
    "Bayer",
    "Virbac",
    "Ceva",
    "Norbrook",
  ];
  return random.arrayElement(brands);
}

function generateConcentration(): string {
  const concentrations = [
    "25mg/tablet",
    "50mg/tablet",
    "100mg/tablet",
    "250mg/tablet",
    "500mg/tablet",
    "5mg/mL",
    "10mg/mL",
    "25mg/mL",
    "50mg/mL",
    "100mg/mL",
    "1000 IU/tablet",
    "2000 IU/tablet",
    "5000 IU/tablet",
  ];
  return random.arrayElement(concentrations);
}

function generateLotNumber(): string {
  const prefix = random.alphaNumeric(2).toUpperCase();
  const numbers = random.int(10000, 99999);
  const suffix = random.alphaNumeric(1).toUpperCase();
  return `${prefix}${numbers}${suffix}`;
}

function generateBarcode(): string {
  // Generate UPC-like barcode
  return random.int(100000000000, 999999999999).toString();
}

function generateSupplier(): string {
  const suppliers = [
    "VetSource",
    "Patterson Veterinary",
    "Henry Schein Animal Health",
    "MWI Veterinary Supply",
    "Butler Schein Animal Health",
    "Covetrus",
    "Direct Vet Marketing",
    "Local Veterinary Pharmacy",
    "Chewy Pharmacy",
    "Petco Health & Wellness",
  ];
  return random.arrayElement(suppliers);
}

function generateInventoryNotes(): string {
  const notes = [
    "Store in cool, dry place",
    "Refrigerate after opening",
    "Use within 30 days of opening",
    "Keep away from light",
    "Do not freeze",
    "Shake well before use",
    "For veterinary use only",
    "Expires 6 months after opening",
    "Store at room temperature",
    "Keep tightly closed",
  ];
  return random.arrayElement(notes);
}

// Inventory builder class for complex scenarios
export class InventoryBuilder {
  private item: Partial<NewInventoryItem> = {};

  static create(): InventoryBuilder {
    return new InventoryBuilder();
  }

  inHousehold(householdId: string): InventoryBuilder {
    this.item.householdId = householdId;
    return this;
  }

  forMedication(medicationId: string): InventoryBuilder {
    this.item.medicationId = medicationId;
    return this;
  }

  assignedTo(animalId: string): InventoryBuilder {
    this.item.assignedAnimalId = animalId;
    return this;
  }

  withQuantity(total: number, remaining?: number): InventoryBuilder {
    this.item.quantityUnits = total;
    this.item.unitsRemaining = remaining ?? random.int(0, total);
    return this;
  }

  withUnitType(unitType: string): InventoryBuilder {
    this.item.unitType = unitType;
    return this;
  }

  withConcentration(concentration: string): InventoryBuilder {
    this.item.concentration = concentration;
    return this;
  }

  withLot(lot: string): InventoryBuilder {
    this.item.lot = lot;
    return this;
  }

  expiresIn(months: number): InventoryBuilder {
    this.item.expiresOn = dates.toDateString(dates.monthsFromNow(months));
    return this;
  }

  isExpired(): InventoryBuilder {
    this.item.expiresOn = dates.toDateString(
      dates.monthsFromNow(-random.int(1, 12)),
    );
    return this;
  }

  withStorage(
    storageType: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED",
  ): InventoryBuilder {
    this.item.storage = storageType as any;
    return this;
  }

  isInUse(openedDaysAgo?: number): InventoryBuilder {
    this.item.inUse = true;
    this.item.openedOn = dates.toDateString(
      dates.daysFromNow(-(openedDaysAgo || random.int(1, 30))),
    );
    return this;
  }

  isNotInUse(): InventoryBuilder {
    this.item.inUse = false;
    this.item.openedOn = null;
    return this;
  }

  withBrand(brandName: string): InventoryBuilder {
    this.item.brandOverride = brandName;
    return this;
  }

  withBarcode(barcode: string): InventoryBuilder {
    this.item.barcode = barcode;
    return this;
  }

  purchasedFor(price: number, daysAgo?: number): InventoryBuilder {
    this.item.purchasePrice = price.toString();
    this.item.purchaseDate = dates.toDateString(
      dates.daysFromNow(-(daysAgo || random.int(30, 180))),
    );
    return this;
  }

  fromSupplier(supplier: string): InventoryBuilder {
    this.item.supplier = supplier;
    return this;
  }

  withNotes(notes: string): InventoryBuilder {
    this.item.notes = notes;
    return this;
  }

  createdDaysAgo(days: number): InventoryBuilder {
    this.item.createdAt = dates.daysFromNow(-days).toISOString();
    this.item.updatedAt = dates.dateRecent(Math.min(days, 7)).toISOString();
    return this;
  }

  build(): NewInventoryItem {
    return createInventoryItem(this.item);
  }
}

// Preset inventory types for common scenarios
export const inventoryPresets = {
  newMedication: (
    householdId: string,
    medicationId: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .withQuantity(30, 30) // Full bottle
      .withUnitType("tablets")
      .withConcentration("250mg/tablet")
      .expiresIn(18)
      .withStorage("ROOM")
      .isNotInUse()
      .purchasedFor(45.99, 7)
      .fromSupplier("VetSource")
      .createdDaysAgo(7)
      .build(),

  partiallyUsed: (
    householdId: string,
    medicationId: string,
    animalId?: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .assignedTo(animalId || random.uuid())
      .withQuantity(30, random.int(10, 25)) // Partially used
      .withUnitType("tablets")
      .withConcentration("100mg/tablet")
      .expiresIn(12)
      .withStorage("ROOM")
      .isInUse(14)
      .purchasedFor(32.5, 30)
      .fromSupplier("Patterson Veterinary")
      .withNotes("In use for current regimen")
      .createdDaysAgo(30)
      .build(),

  liquidMedication: (
    householdId: string,
    medicationId: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .withQuantity(100, 75) // 75mL remaining
      .withUnitType("mL")
      .withConcentration("50mg/mL")
      .expiresIn(8)
      .withStorage("FRIDGE")
      .isInUse(10)
      .purchasedFor(89.99, 45)
      .fromSupplier("Covetrus")
      .withNotes("Refrigerate after opening. Shake well before use.")
      .createdDaysAgo(45)
      .build(),

  nearExpiration: (
    householdId: string,
    medicationId: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .withQuantity(60, 45)
      .withUnitType("tablets")
      .withConcentration("25mg/tablet")
      .expiresIn(1) // Expires in 1 month
      .withStorage("ROOM")
      .isInUse(90)
      .purchasedFor(28.75, 120)
      .fromSupplier("Henry Schein Animal Health")
      .withNotes("Expires soon - use first")
      .createdDaysAgo(120)
      .build(),

  expiredMedication: (
    householdId: string,
    medicationId: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .withQuantity(20, 15)
      .withUnitType("tablets")
      .withConcentration("500mg/tablet")
      .isExpired() // Already expired
      .withStorage("ROOM")
      .isInUse(200)
      .purchasedFor(65.0, 365)
      .fromSupplier("MWI Veterinary Supply")
      .withNotes("EXPIRED - Do not use")
      .createdDaysAgo(365)
      .build(),

  controlledSubstance: (
    householdId: string,
    medicationId: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .withQuantity(20, 18)
      .withUnitType("tablets")
      .withConcentration("10mg/tablet")
      .expiresIn(6)
      .withStorage("CONTROLLED")
      .isInUse(7)
      .purchasedFor(125.0, 14)
      .fromSupplier("Butler Schein Animal Health")
      .withNotes("Controlled substance - secure storage required")
      .createdDaysAgo(14)
      .build(),

  highValueItem: (
    householdId: string,
    medicationId: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .withQuantity(6, 4) // Expensive medication, small quantity
      .withUnitType("syringes")
      .withConcentration("0.5mL/syringe")
      .expiresIn(24)
      .withStorage("FRIDGE")
      .isInUse(21)
      .purchasedFor(350.0, 30)
      .fromSupplier("Zoetis")
      .withBrand("Zoetis Premium")
      .withNotes("High-value medication. Refrigerate. Single-use syringes.")
      .createdDaysAgo(30)
      .build(),

  emergencyStock: (
    householdId: string,
    medicationId: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .withQuantity(10, 10) // Full emergency supply
      .withUnitType("doses")
      .withConcentration("1 dose/vial")
      .expiresIn(36)
      .withStorage("FREEZER")
      .isNotInUse()
      .purchasedFor(180.0, 180)
      .fromSupplier("Emergency Vet Supply")
      .withNotes("Emergency stock - do not use unless critical")
      .createdDaysAgo(180)
      .build(),

  emptyContainer: (
    householdId: string,
    medicationId: string,
  ): NewInventoryItem =>
    InventoryBuilder.create()
      .inHousehold(householdId)
      .forMedication(medicationId)
      .withQuantity(60, 0) // Empty
      .withUnitType("tablets")
      .withConcentration("200mg/tablet")
      .expiresIn(6)
      .withStorage("ROOM")
      .isInUse(45)
      .purchasedFor(42.0, 90)
      .fromSupplier("Direct Vet Marketing")
      .withNotes("Empty container - reorder needed")
      .createdDaysAgo(90)
      .build(),
};
