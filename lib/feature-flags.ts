/**
 * Feature Flags Configuration
 *
 * This module provides runtime feature toggles for the VetMed Tracker application.
 * Feature flags allow us to deploy code with features disabled and enable them
 * gradually or in case of issues, disable them quickly.
 */

export interface FeatureFlags {
  // Core Features
  pushNotifications: boolean;
  bulkOperations: boolean;
  advancedReporting: boolean;

  // Performance Features
  serviceWorker: boolean;
  caching: boolean;
  backgroundSync: boolean;

  // UI Features
  darkMode: boolean;
  experimentalUI: boolean;
  mobileOptimizations: boolean;

  // Admin Features
  adminPanel: boolean;
  userManagement: boolean;
  systemMetrics: boolean;

  // Development Features (only available in non-prod)
  debugMode: boolean;
  testingTools: boolean;
  mockData: boolean;
}

/**
 * Default feature flag values
 */
const DEFAULT_FLAGS: FeatureFlags = {
  // Admin Features - Enabled by default
  adminPanel: true,
  advancedReporting: true,
  backgroundSync: true,
  bulkOperations: true,
  caching: true,

  // UI Features - Enabled by default
  darkMode: true,

  // Development Features - Disabled in production
  debugMode: false,
  experimentalUI: false, // Disabled by default for stability
  mobileOptimizations: true,
  mockData: false,
  // Core Features - Generally enabled in production
  pushNotifications: true,

  // Performance Features - Enabled by default
  serviceWorker: true,
  systemMetrics: true,
  testingTools: false,
  userManagement: true,
};

/**
 * Environment-based feature flag overrides
 */
function getEnvironmentFlags(): Partial<FeatureFlags> {
  const env = process.env.NODE_ENV;

  // Development environment overrides
  if (env === "development") {
    return {
      debugMode: process.env.FEATURE_DEBUG_MODE === "true",
      experimentalUI: process.env.FEATURE_EXPERIMENTAL_UI === "true",
      mockData: process.env.FEATURE_MOCK_DATA === "true",
      testingTools: process.env.FEATURE_TESTING_TOOLS === "true",
    };
  }

  // Test environment overrides
  if (env === "test") {
    return {
      debugMode: false,
      mockData: true,
      pushNotifications: false, // Disabled in tests
      serviceWorker: false, // Disabled in tests
      testingTools: true,
    };
  }

  // Production environment overrides from env vars
  return {
    adminPanel: process.env.FEATURE_ADMIN_PANEL === "true",
    advancedReporting: process.env.FEATURE_ADVANCED_REPORTING === "true",
    backgroundSync: process.env.FEATURE_BACKGROUND_SYNC === "true",
    bulkOperations: process.env.FEATURE_BULK_OPERATIONS === "true",
    caching: process.env.FEATURE_CACHING === "true",
    darkMode: process.env.FEATURE_DARK_MODE === "true",
    debugMode: false, // Always disabled in production
    experimentalUI: process.env.FEATURE_EXPERIMENTAL_UI === "true",
    mobileOptimizations: process.env.FEATURE_MOBILE_OPTIMIZATIONS === "true",
    mockData: false, // Always disabled in production
    pushNotifications: process.env.FEATURE_PUSH_NOTIFICATIONS === "true",
    serviceWorker: process.env.FEATURE_SERVICE_WORKER === "true",
    systemMetrics: process.env.FEATURE_SYSTEM_METRICS === "true",
    testingTools: false, // Always disabled in production
    userManagement: process.env.FEATURE_USER_MANAGEMENT === "true",
  };
}

/**
 * Get the complete feature flags configuration
 */
export function getFeatureFlags(): FeatureFlags {
  const environmentFlags = getEnvironmentFlags();

  return {
    ...DEFAULT_FLAGS,
    ...environmentFlags,
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Get feature flags for client-side use (excludes sensitive flags)
 */
export function getClientFeatureFlags(): Partial<FeatureFlags> {
  const flags = getFeatureFlags();

  // Only include client-safe feature flags
  return {
    advancedReporting: flags.advancedReporting,
    backgroundSync: flags.backgroundSync,
    bulkOperations: flags.bulkOperations,
    caching: flags.caching,
    darkMode: flags.darkMode,
    debugMode: flags.debugMode && process.env.NODE_ENV !== "production",
    experimentalUI: flags.experimentalUI,
    mobileOptimizations: flags.mobileOptimizations,
    pushNotifications: flags.pushNotifications,
    serviceWorker: flags.serviceWorker,
  };
}

/**
 * Feature flag kill switch - emergency disable for production
 * Set EMERGENCY_DISABLE_FEATURES=true to disable non-essential features
 */
export function getEmergencyModeFlags(): Partial<FeatureFlags> {
  if (process.env.EMERGENCY_DISABLE_FEATURES === "true") {
    console.warn("Emergency mode enabled - non-essential features disabled");

    return {
      adminPanel: false,
      advancedReporting: false,
      backgroundSync: false,
      bulkOperations: false,
      debugMode: false,
      experimentalUI: false,
      mockData: false,
      pushNotifications: false,
      serviceWorker: false,
      systemMetrics: false,
      testingTools: false,
      userManagement: false,
    };
  }

  return {};
}

/**
 * Get feature flags with emergency mode applied
 */
export function getProductionFeatureFlags(): FeatureFlags {
  const baseFlags = getFeatureFlags();
  const emergencyFlags = getEmergencyModeFlags();

  return {
    ...baseFlags,
    ...emergencyFlags,
  };
}

/**
 * Server-side feature flags instance (computed once per request)
 */
export const features = getProductionFeatureFlags();
