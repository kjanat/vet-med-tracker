import { useEffect } from "react";

import type {
  HouseholdSettings,
  VetMedPreferences,
} from "./app-provider-consolidated.tsx";

interface Params {
  defaultHouseholdSettings: HouseholdSettings;
  defaultPreferences: VetMedPreferences;
  onFirstTimeUserChange: (isFirstTime: boolean) => void;
  onHouseholdSettings: (settings: HouseholdSettings) => void;
  onPreferences: (preferences: VetMedPreferences) => void;
  stackUser: {
    clientMetadata?: Record<string, unknown> | undefined;
  } | null;
}

export const useStackMetadataPreferences = ({
  defaultHouseholdSettings,
  defaultPreferences,
  onFirstTimeUserChange,
  onHouseholdSettings,
  onPreferences,
  stackUser,
}: Params) => {
  useEffect(() => {
    const metadata = stackUser?.clientMetadata;
    if (!metadata) {
      return;
    }

    const vetMedPrefs = metadata["vetMedPreferences"] as
      | Partial<VetMedPreferences>
      | undefined;
    const householdSettings = metadata["householdSettings"] as
      | Partial<HouseholdSettings>
      | undefined;

    if (vetMedPrefs) {
      onPreferences({
        ...defaultPreferences,
        ...vetMedPrefs,
      });
    }

    if (householdSettings) {
      onHouseholdSettings({
        ...defaultHouseholdSettings,
        ...householdSettings,
      });
    }

    const hasPreferences = Boolean(vetMedPrefs) || Boolean(householdSettings);
    const hasCompletedOnboarding = Boolean(metadata["onboardingComplete"]);
    onFirstTimeUserChange(!hasPreferences && !hasCompletedOnboarding);
  }, [
    defaultHouseholdSettings,
    defaultPreferences,
    onFirstTimeUserChange,
    onHouseholdSettings,
    onPreferences,
    stackUser?.clientMetadata,
  ]);
};
