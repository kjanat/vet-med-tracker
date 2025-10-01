"use client";

export interface VetMedPreferences {
  defaultTimezone: string;
  preferredPhoneNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notificationPreferences: {
    emailReminders: boolean;
    smsReminders: boolean;
    pushNotifications: boolean;
    reminderLeadTime: number; // minutes before due time
  };
  displayPreferences: {
    use24HourTime: boolean;
    temperatureUnit: "celsius" | "fahrenheit";
    weightUnit: "kg" | "lbs";
    weekStartsOn?: 0 | 1; // 0 = Sunday, 1 = Monday
    theme?: "system" | "light" | "dark";
  };
  defaultHouseholdId?: string;
  defaultAnimalId?: string;
}
