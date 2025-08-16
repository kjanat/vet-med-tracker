// Centralized type definitions
export interface Animal {
  id: string;
  name: string;
  species: string;
  breed?: string;
  sex?: "Male" | "Female";
  neutered?: boolean;
  dob?: Date;
  weightKg?: number;
  microchipId?: string;
  color?: string;
  photo?: string;
  timezone: string;
  vetName?: string;
  vetPhone?: string;
  vetEmail?: string | null;
  clinicName?: string | null;
  notes?: string | null;
  allergies: string[];
  conditions: string[];
  avatar?: string;
  pendingMeds: number;
}

// Type for minimal Animal representation used in some contexts
export type MinimalAnimal = Pick<Animal, "id" | "name" | "species">;

// Extended Animal types for specific views
export interface AnimalWithPhoto extends Animal {
  photoUrl?: string | null;
}

export interface EmergencyAnimal extends AnimalWithPhoto {
  vetEmail?: string | null;
  clinicName?: string | null;
  notes?: string | null;
}

export type ReportAnimal = AnimalWithPhoto;

// Medication related types
export type ScheduleType = "FIXED" | "PRN" | "INTERVAL" | "TAPER";

export interface Medication {
  genericName: string;
  brandName: string | null;
  strength: string | null;
  route: string;
}

export interface EmergencyRegimen {
  id: string;
  name: string | null;
  instructions: string | null;
  scheduleType: ScheduleType;
  timesLocal: string[] | null;
  prnReason: string | null;
  route: string | null;
  medication?: Medication;
}

// Report specific types
export interface ComplianceData {
  adherencePct: number;
  scheduled: number;
  completed: number;
  missed: number;
  late: number;
  veryLate: number;
  streak: number;
}

export interface RegimenSummary {
  id: string;
  medicationName: string;
  strength: string | null;
  route: string;
  schedule: string;
  adherence: number;
  notes: string | null;
}

export interface NotableEvent {
  id: string;
  date: Date;
  medication: string;
  note: string;
  tags: string[];
}

export interface ReportData {
  animal: ReportAnimal;
  compliance: ComplianceData;
  regimens: RegimenSummary[];
  notableEvents: NotableEvent[];
}

// Administration status enum values
export type AdminStatus = "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED" | "PRN";

// Inventory storage enum values
export type StorageType = "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";

// Administration record type
export interface AdministrationRecord {
  id: string;
  animalId: string;
  animalName: string;
  medicationName: string;
  strength: string;
  route: string;
  form: string;
  slot?: string; // "Morning", "Evening", "PRN"
  scheduledFor?: Date;
  recordedAt: Date;
  caregiverName: string;
  status: AdminStatus;
  cosignPending: boolean;
  cosignUser?: string;
  cosignedAt?: Date;
  sourceItem?: {
    name?: string;
    lot?: string;
    expiresOn?: Date;
  };
  site?: string;
  notes?: string;
  media?: string[];
  isEdited: boolean;
  isDeleted: boolean;
  editedBy?: string;
  editedAt?: Date;
}
