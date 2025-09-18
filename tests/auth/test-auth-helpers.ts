import type {
  AppContextType,
  User,
  UserProfile,
} from "@/components/providers/app-provider-consolidated";

const BASE_USER: User = {
  bio: null,
  createdAt: "2024-01-01T00:00:00Z",
  defaultAnimalId: null,
  defaultHouseholdId: null,
  email: "john@example.com",
  emailReminders: true,
  emailVerified: null,
  emergencyContactName: null,
  emergencyContactPhone: null,
  firstName: null,
  id: "user-123",
  image: "https://example.com/avatar.jpg",
  lastName: null,
  location: null,
  name: "John Doe",
  onboardingComplete: false,
  onboardingCompletedAt: null,
  preferencesBackup: null,
  preferredPhoneNumber: null,
  preferredTimezone: "UTC",
  profileCompletedAt: null,
  profileData: {},
  profileVisibility: { bio: true, email: false, location: true, name: true },
  pronouns: null,
  pushNotifications: true,
  reminderLeadTimeMinutes: "15",
  smsReminders: false,
  socialLinks: {},
  stackUserId: null,
  temperatureUnit: "fahrenheit",
  theme: "light",
  updatedAt: "2024-01-01T00:00:00Z",
  use24HourTime: false,
  website: null,
  weekStartsOn: 0,
  weightUnit: "lbs",
};

const BASE_PROFILE: UserProfile = {
  availableHouseholds: [],
  currentHouseholdId: null,
  email: "john@example.com",
  id: "user-123",
  image: "https://example.com/avatar.jpg",
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
              user.emailReminders ?? BASE_PROFILE.preferences.emailReminders,
            phoneNumber:
              user.preferredPhoneNumber ?? BASE_PROFILE.preferences.phoneNumber,
            pushNotifications:
              user.pushNotifications ??
              BASE_PROFILE.preferences.pushNotifications,
            smsReminders:
              user.smsReminders ?? BASE_PROFILE.preferences.smsReminders,
            temperatureUnit:
              user.temperatureUnit ?? BASE_PROFILE.preferences.temperatureUnit,
            timezone:
              user.preferredTimezone ?? BASE_PROFILE.preferences.timezone,
            use24HourTime:
              user.use24HourTime ?? BASE_PROFILE.preferences.use24HourTime,
            weightUnit: user.weightUnit ?? BASE_PROFILE.preferences.weightUnit,
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
    onboarding: {
      ...baseProfile.onboarding,
      ...overrides.onboarding,
    },
    preferences: mergedPreferences,
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
    isOffline: false,
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
