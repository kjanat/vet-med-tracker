import type {
  AppContextType,
  User,
} from "@/components/providers/app-provider-consolidated";
import type { UserProfile } from "@/types/app-state";

const BASE_USER: User = {
  createdAt: new Date("2024-01-01T00:00:00Z"),
  defaultAnimalId: null,
  defaultHouseholdId: null,
  email: "john@example.com",
  emailVerified: null,
  id: "user-123",
  image: "https://example.com/avatar.jpg",
  name: "John Doe",
  onboardingComplete: false,
  onboardingCompletedAt: null,
  preferences: {
    defaultAnimalId: null,
    defaultHouseholdId: null,
    defaultTimezone: "UTC",
    displayPreferences: {
      temperatureUnit: "fahrenheit",
      theme: "light",
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
  },
  profile: {
    bio: null,
    firstName: null,
    lastName: null,
    legacyProfileData: {},
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
  },
  stackUserId: null,
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const BASE_PROFILE: UserProfile = {
  availableHouseholds: [],
  bio: null,
  currentHouseholdId: null,
  email: "john@example.com",
  firstName: null,
  id: "user-123",
  image: "https://example.com/avatar.jpg",
  lastName: null,
  location: null,
  name: "John Doe",
  onboarding: {
    complete: false,
    completedAt: null,
  },
  preferences: {
    emailReminders: true,
    emergencyContact: {
      name: null,
      phone: null,
    },
    phoneNumber: null,
    pushNotifications: true,
    reminderLeadTime: "15",
    smsReminders: false,
    temperatureUnit: "fahrenheit",
    timezone: "UTC",
    use24HourTime: false,
    weightUnit: "lbs",
  },
  pronouns: null,
  stackUserId: null,
};

function mergePreferences(
  base: UserProfile["preferences"],
  overrides?: Partial<UserProfile["preferences"]>,
): UserProfile["preferences"] {
  if (!overrides) return base;

  return {
    ...base,
    ...overrides,
    emergencyContact: {
      ...base.emergencyContact,
      ...(overrides.emergencyContact ?? {}),
    },
  };
}

export function createTestUser(overrides: Partial<User> = {}): User {
  return { ...BASE_USER, ...overrides };
}

export function createTestUserProfile(
  user: User | null,
  overrides: Partial<UserProfile> = {},
): UserProfile {
  const userDerived: Partial<UserProfile> = user
    ? {
        currentHouseholdId: user.defaultHouseholdId,
        email: user.email,
        id: user.id,
        image: user.image,
        name: user.name,
        stackUserId: user.stackUserId,
      }
    : {};

  const baseProfile: UserProfile = {
    ...BASE_PROFILE,
    ...userDerived,
  };

  const mergedPreferences = mergePreferences(
    {
      ...BASE_PROFILE.preferences,
      ...(user
        ? {
            emailReminders:
              user.preferences.notificationPreferences.emailReminders,
            phoneNumber:
              user.preferences.preferredPhoneNumber ??
              BASE_PROFILE.preferences.phoneNumber,
            pushNotifications:
              user.preferences.notificationPreferences.pushNotifications,
            reminderLeadTime:
              user.preferences.notificationPreferences.reminderLeadTime.toString(),
            smsReminders: user.preferences.notificationPreferences.smsReminders,
            temperatureUnit:
              user.preferences.displayPreferences.temperatureUnit,
            theme: user.preferences.displayPreferences.theme,
            timezone: user.preferences.defaultTimezone,
            use24HourTime: user.preferences.displayPreferences.use24HourTime,
            weekStartsOn: user.preferences.displayPreferences.weekStartsOn,
            weightUnit: user.preferences.displayPreferences.weightUnit,
          }
        : {}),
    },
    overrides.preferences,
  );

  return {
    ...baseProfile,
    ...overrides,
    availableHouseholds:
      overrides.availableHouseholds ?? baseProfile.availableHouseholds,
    bio: overrides.bio ?? user?.profile.bio ?? baseProfile.bio,
    firstName:
      overrides.firstName ?? user?.profile.firstName ?? baseProfile.firstName,
    lastName:
      overrides.lastName ?? user?.profile.lastName ?? baseProfile.lastName,
    location:
      overrides.location ?? user?.profile.location ?? baseProfile.location,
    onboarding: {
      ...baseProfile.onboarding,
      ...overrides.onboarding,
    },
    preferences: mergedPreferences,
    pronouns:
      overrides.pronouns ?? user?.profile.pronouns ?? baseProfile.pronouns,
  };
}

export type TestAuthOverrides = Partial<
  Pick<
    AppContextType,
    | "user"
    | "userProfile"
    | "logout"
    | "loading"
    | "login"
    | "isAuthenticated"
    | "authStatus"
    | "households"
    | "errors"
  >
>;

export function createTestAppContext(
  overrides: Partial<AppContextType> = {},
): AppContextType {
  const user = overrides.user ?? null;
  const userProfile =
    overrides.userProfile ?? (user ? createTestUserProfile(user) : null);

  const defaultContext: AppContextType = {
    accessibility: {
      announcements: { assertive: "", polite: "" },
      fontSize: "medium",
      highContrast: false,
      reducedMotion: false,
    },
    animals: [],
    announce: () => {},
    authStatus: user ? "authenticated" : "unauthenticated",
    errors: {
      animals: null,
      households: null,
      pendingMeds: null,
      user: null,
    },
    formatTemperature: () => "",
    formatTime: () => "",
    formatWeight: () => "",
    getUserTimezone: () => "UTC",
    householdSettings: {
      defaultLocation: {
        address: "",
        city: "",
        state: "",
        timezone: "UTC",
        zipCode: "",
      },
      householdRoles: [],
      inventoryPreferences: {
        autoReorderEnabled: false,
        expirationWarningDays: 30,
        lowStockThreshold: 7,
      },
      preferredVeterinarian: {
        address: "",
        name: "",
        phone: "",
      },
      primaryHouseholdName: "",
    },
    households: [],
    isAuthenticated: Boolean(user),
    isFirstTimeUser: false,
    loading: {
      animals: false,
      households: false,
      pendingMeds: false,
      user: false,
    },
    login: () => {},
    logout: async () => {},
    markOnboardingComplete: async () => {},
    pendingSyncCount: 0,
    preferences: {
      defaultTimezone: "UTC",
      displayPreferences: {
        temperatureUnit: "celsius",
        theme: "system",
        use24HourTime: false,
        weekStartsOn: 0,
        weightUnit: "kg",
      },
      emergencyContactName: "",
      emergencyContactPhone: "",
      notificationPreferences: {
        emailReminders: true,
        pushNotifications: true,
        reminderLeadTime: 30,
        smsReminders: false,
      },
      preferredPhoneNumber: "",
    },
    refreshAuth: async () => {},
    refreshPendingMeds: () => {},
    selectedAnimal: null,
    selectedAnimalId: null,
    selectedHousehold: null,
    selectedHouseholdId: null,
    setSelectedAnimal: () => {},
    setSelectedHousehold: () => {},
    updateHouseholdSettings: async () => {},
    updateVetMedPreferences: async () => {},
    user,
    userProfile,
  };

  const context: AppContextType = {
    ...defaultContext,
    ...overrides,
    accessibility: {
      ...defaultContext.accessibility,
      ...overrides.accessibility,
      announcements: {
        ...defaultContext.accessibility.announcements,
        ...(overrides.accessibility?.announcements ?? {}),
      },
    },
    errors: {
      ...defaultContext.errors,
      ...overrides.errors,
    },
    householdSettings: {
      ...defaultContext.householdSettings,
      ...overrides.householdSettings,
      defaultLocation: {
        ...defaultContext.householdSettings.defaultLocation,
        ...(overrides.householdSettings?.defaultLocation ?? {}),
      },
      inventoryPreferences: {
        ...defaultContext.householdSettings.inventoryPreferences,
        ...(overrides.householdSettings?.inventoryPreferences ?? {}),
      },
      preferredVeterinarian: {
        ...defaultContext.householdSettings.preferredVeterinarian,
        ...(overrides.householdSettings?.preferredVeterinarian ?? {}),
      },
    },
    loading: {
      ...defaultContext.loading,
      ...overrides.loading,
    },
    preferences: {
      ...defaultContext.preferences,
      ...overrides.preferences,
      displayPreferences: {
        ...defaultContext.preferences.displayPreferences,
        ...(overrides.preferences?.displayPreferences ?? {}),
      },
      notificationPreferences: {
        ...defaultContext.preferences.notificationPreferences,
        ...(overrides.preferences?.notificationPreferences ?? {}),
      },
    },
  };

  return context;
}
