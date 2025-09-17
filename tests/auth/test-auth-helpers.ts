import type {
  AppContextType,
  User,
  UserProfile,
} from "@/components/providers/app-provider-consolidated";

const BASE_USER: User = {
  id: "user-123",
  email: "john@example.com",
  name: "John Doe",
  firstName: null,
  lastName: null,
  image: "https://example.com/avatar.jpg",
  emailVerified: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  stackUserId: null,
  bio: null,
  pronouns: null,
  location: null,
  website: null,
  socialLinks: {},
  profileData: {},
  profileVisibility: { name: true, email: false, bio: true, location: true },
  profileCompletedAt: null,
  pushNotifications: true,
  preferredTimezone: "UTC",
  preferredPhoneNumber: null,
  use24HourTime: false,
  temperatureUnit: "fahrenheit",
  weightUnit: "lbs",
  emailReminders: true,
  smsReminders: false,
  reminderLeadTimeMinutes: "15",
  emergencyContactName: null,
  emergencyContactPhone: null,
  onboardingComplete: false,
  onboardingCompletedAt: null,
  preferencesBackup: null,
  weekStartsOn: 0,
  defaultHouseholdId: null,
  defaultAnimalId: null,
  theme: "light",
};

const BASE_PROFILE: UserProfile = {
  id: "user-123",
  stackUserId: null,
  email: "john@example.com",
  name: "John Doe",
  image: "https://example.com/avatar.jpg",
  preferences: {
    timezone: "UTC",
    phoneNumber: null,
    use24HourTime: false,
    temperatureUnit: "fahrenheit",
    weightUnit: "lbs",
    emailReminders: true,
    smsReminders: false,
    pushNotifications: true,
    reminderLeadTime: "15",
    emergencyContact: {
      name: null,
      phone: null,
    },
  },
  onboarding: {
    complete: false,
    completedAt: null,
  },
  availableHouseholds: [],
  currentHouseholdId: null,
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
        id: user.id,
        stackUserId: user.stackUserId,
        email: user.email,
        name: user.name,
        image: user.image,
        currentHouseholdId: user.defaultHouseholdId,
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
            timezone:
              user.preferredTimezone ?? BASE_PROFILE.preferences.timezone,
            phoneNumber:
              user.preferredPhoneNumber ?? BASE_PROFILE.preferences.phoneNumber,
            use24HourTime:
              user.use24HourTime ?? BASE_PROFILE.preferences.use24HourTime,
            temperatureUnit:
              user.temperatureUnit ?? BASE_PROFILE.preferences.temperatureUnit,
            weightUnit: user.weightUnit ?? BASE_PROFILE.preferences.weightUnit,
            emailReminders:
              user.emailReminders ?? BASE_PROFILE.preferences.emailReminders,
            smsReminders:
              user.smsReminders ?? BASE_PROFILE.preferences.smsReminders,
            pushNotifications:
              user.pushNotifications ??
              BASE_PROFILE.preferences.pushNotifications,
          }
        : {}),
    },
    overrides.preferences,
  );

  return {
    ...baseProfile,
    ...overrides,
    preferences: mergedPreferences,
    onboarding: {
      ...baseProfile.onboarding,
      ...overrides.onboarding,
    },
    availableHouseholds:
      overrides.availableHouseholds ?? baseProfile.availableHouseholds,
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
    selectedHouseholdId: null,
    selectedAnimalId: null,
    households: [],
    animals: [],
    user,
    userProfile,
    isAuthenticated: Boolean(user),
    authStatus: user ? "authenticated" : "unauthenticated",
    preferences: {
      defaultTimezone: "UTC",
      preferredPhoneNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      notificationPreferences: {
        emailReminders: true,
        smsReminders: false,
        pushNotifications: true,
        reminderLeadTime: 30,
      },
      displayPreferences: {
        use24HourTime: false,
        temperatureUnit: "celsius",
        weightUnit: "kg",
        weekStartsOn: 0,
        theme: "system",
      },
    },
    householdSettings: {
      primaryHouseholdName: "",
      defaultLocation: {
        address: "",
        city: "",
        state: "",
        zipCode: "",
        timezone: "UTC",
      },
      householdRoles: [],
      preferredVeterinarian: {
        name: "",
        phone: "",
        address: "",
      },
      inventoryPreferences: {
        lowStockThreshold: 7,
        autoReorderEnabled: false,
        expirationWarningDays: 30,
      },
    },
    isFirstTimeUser: false,
    accessibility: {
      announcements: { polite: "", assertive: "" },
      reducedMotion: false,
      highContrast: false,
      fontSize: "medium",
    },
    isOffline: false,
    pendingSyncCount: 0,
    loading: {
      user: false,
      households: false,
      animals: false,
      pendingMeds: false,
    },
    errors: {
      user: null,
      households: null,
      animals: null,
      pendingMeds: null,
    },
    setSelectedHousehold: () => {},
    setSelectedAnimal: () => {},
    refreshPendingMeds: () => {},
    login: () => {},
    logout: async () => {},
    refreshAuth: async () => {},
    updateVetMedPreferences: async () => {},
    updateHouseholdSettings: async () => {},
    markOnboardingComplete: async () => {},
    announce: () => {},
    formatTime: () => "",
    formatWeight: () => "",
    formatTemperature: () => "",
    getUserTimezone: () => "UTC",
    selectedHousehold: null,
    selectedAnimal: null,
  };

  const context: AppContextType = {
    ...defaultContext,
    ...overrides,
    loading: {
      ...defaultContext.loading,
      ...overrides.loading,
    },
    errors: {
      ...defaultContext.errors,
      ...overrides.errors,
    },
    preferences: {
      ...defaultContext.preferences,
      ...overrides.preferences,
      notificationPreferences: {
        ...defaultContext.preferences.notificationPreferences,
        ...(overrides.preferences?.notificationPreferences ?? {}),
      },
      displayPreferences: {
        ...defaultContext.preferences.displayPreferences,
        ...(overrides.preferences?.displayPreferences ?? {}),
      },
    },
    householdSettings: {
      ...defaultContext.householdSettings,
      ...overrides.householdSettings,
      defaultLocation: {
        ...defaultContext.householdSettings.defaultLocation,
        ...(overrides.householdSettings?.defaultLocation ?? {}),
      },
      preferredVeterinarian: {
        ...defaultContext.householdSettings.preferredVeterinarian,
        ...(overrides.householdSettings?.preferredVeterinarian ?? {}),
      },
      inventoryPreferences: {
        ...defaultContext.householdSettings.inventoryPreferences,
        ...(overrides.householdSettings?.inventoryPreferences ?? {}),
      },
    },
    accessibility: {
      ...defaultContext.accessibility,
      ...overrides.accessibility,
      announcements: {
        ...defaultContext.accessibility.announcements,
        ...(overrides.accessibility?.announcements ?? {}),
      },
    },
  };

  return context;
}
