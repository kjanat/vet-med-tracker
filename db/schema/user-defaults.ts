import type { UserPreferencesSchema, UserProfileSchema } from "./tables";

export const defaultUserPreferences: UserPreferencesSchema = {
  defaultAnimalId: null,
  defaultHouseholdId: null,
  defaultTimezone: "America/New_York",
  displayPreferences: {
    temperatureUnit: "fahrenheit",
    theme: "system",
    use24HourTime: false,
    weekStartsOn: 0,
    weightUnit: "lbs",
  },
  emergencyContactName: null,
  emergencyContactPhone: null,
  legacyBackup: null,
  notificationPreferences: {
    emailReminders: true,
    pushNotifications: true,
    reminderLeadTime: 15,
    smsReminders: false,
  },
  preferredPhoneNumber: null,
};

export const defaultUserProfile: UserProfileSchema = {
  bio: null,
  firstName: null,
  lastName: null,
  legacyProfileData: null,
  location: null,
  profileCompletedAt: null,
  profileVisibility: {
    bio: true,
    email: false,
    location: true,
    name: true,
  },
  pronouns: null,
  socialLinks: {},
  website: null,
};
