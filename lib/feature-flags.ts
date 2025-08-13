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
  offlineMode: boolean;

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
  // Core Features - Generally enabled in production
  pushNotifications: true,
  bulkOperations: true,
  advancedReporting: true,
  offlineMode: true,

  // Performance Features - Enabled by default
  serviceWorker: true,
  caching: true,
  backgroundSync: true,

  // UI Features - Enabled by default
  darkMode: true,
  experimentalUI: false, // Disabled by default for stability
  mobileOptimizations: true,

  // Admin Features - Enabled by default
  adminPanel: true,
  userManagement: true,
  systemMetrics: true,

  // Development Features - Disabled in production
  debugMode: false,
  testingTools: false,
  mockData: false,
};

/**
 * Environment-based feature flag overrides
 */
function getEnvironmentFlags(): Partial<FeatureFlags> {
  const env = process.env.NODE_ENV;

  // Development environment overrides
  if (env === "development") {
    return {
      debugMode: process.env.FEATURE_DEBUG_MODE !== "false",
      testingTools: process.env.FEATURE_TESTING_TOOLS !== "false",
      mockData: process.env.FEATURE_MOCK_DATA === "true",
      experimentalUI: process.env.FEATURE_EXPERIMENTAL_UI === "true",
    };
  }

  // Test environment overrides
  if (env === "test") {
    return {
      debugMode: false,
      testingTools: true,
      mockData: true,
      pushNotifications: false, // Disabled in tests
      serviceWorker: false, // Disabled in tests
    };
  }

  // Production environment overrides from env vars
  return {
    pushNotifications: process.env.FEATURE_PUSH_NOTIFICATIONS !== "false",
    bulkOperations: process.env.FEATURE_BULK_OPERATIONS !== "false",
    advancedReporting: process.env.FEATURE_ADVANCED_REPORTING !== "false",
    offlineMode: process.env.FEATURE_OFFLINE_MODE !== "false",
    serviceWorker: process.env.FEATURE_SERVICE_WORKER !== "false",
    caching: process.env.FEATURE_CACHING !== "false",
    backgroundSync: process.env.FEATURE_BACKGROUND_SYNC !== "false",
    darkMode: process.env.FEATURE_DARK_MODE !== "false",
    experimentalUI: process.env.FEATURE_EXPERIMENTAL_UI === "true",
    mobileOptimizations: process.env.FEATURE_MOBILE_OPTIMIZATIONS !== "false",
    adminPanel: process.env.FEATURE_ADMIN_PANEL !== "false",
    userManagement: process.env.FEATURE_USER_MANAGEMENT !== "false",
    systemMetrics: process.env.FEATURE_SYSTEM_METRICS !== "false",
    debugMode: false, // Always disabled in production
    testingTools: false, // Always disabled in production
    mockData: false, // Always disabled in production
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
    pushNotifications: flags.pushNotifications,
    bulkOperations: flags.bulkOperations,
    advancedReporting: flags.advancedReporting,
    offlineMode: flags.offlineMode,
    serviceWorker: flags.serviceWorker,
    caching: flags.caching,
    backgroundSync: flags.backgroundSync,
    darkMode: flags.darkMode,
    experimentalUI: flags.experimentalUI,
    mobileOptimizations: flags.mobileOptimizations,
    debugMode: flags.debugMode && process.env.NODE_ENV !== "production",
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
      pushNotifications: false,
      bulkOperations: false,
      advancedReporting: false,
      serviceWorker: false,
      backgroundSync: false,
      experimentalUI: false,
      adminPanel: false,
      userManagement: false,
      systemMetrics: false,
      debugMode: false,
      testingTools: false,
      mockData: false,
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
