// Application state types

export interface AppState {
  currentHouseholdId: string | null;
  user: User | null;
  isLoading: boolean;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface Household {
  id: string;
  name: string;
  timezone: string;
  role: "OWNER" | "CAREGIVER" | "VETREADONLY";
}

export interface Animal {
  id: string;
  name: string;
  species: string;
  breed?: string;
  householdId: string;
}

export interface Medication {
  id: string;
  name: string;
  brandName?: string;
  strength: string;
  form: string;
}

export interface Regimen {
  id: string;
  animalId: string;
  medicationId: string;
  dose: string;
  frequency: string;
  instructions?: string;
}

export type LoadingState = "idle" | "loading" | "success" | "error";
