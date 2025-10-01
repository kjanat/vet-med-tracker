"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import type { Animal } from "@/db/schema";
import { trpc } from "@/lib/trpc/client";
import type { EmergencyAnimal, EmergencyRegimen } from "@/lib/utils/types";

const calculateAge = (dob: Date | string | null) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const ageInMilliseconds = Date.now() - birthDate.getTime();
  const ageInYears = ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(ageInYears);
};

export function useEmergencyCardData() {
  const params = useParams();
  const animalId = params["id"] as string;
  const { selectedHousehold, selectedAnimal } = useApp();

  // Stub for emergency contacts - endpoint doesn't exist yet
  const emergencyContacts: Array<Record<string, unknown>> | undefined =
    undefined;

  const { data: animalResponse, isLoading: animalLoading } =
    trpc.animals.getById.useQuery(
      {
        householdId: selectedHousehold?.id || "",
        id: animalId,
      },
      {
        enabled: !!selectedHousehold?.id && !!animalId,
      },
    ) as { data: Animal | undefined; isLoading: boolean };

  const { data: regimensResponse, isLoading: regimensLoading } =
    trpc.regimens.list.useQuery(
      {
        activeOnly: true,
        animalId: animalId,
        householdId: selectedHousehold?.id || "",
      },
      {
        enabled: !!selectedHousehold?.id && !!animalId,
      },
    );

  const regimens: EmergencyRegimen[] = useMemo(
    () =>
      regimensResponse?.map((item) => ({
        id: item.regimen.id,
        instructions: item.regimen.instructions,
        medication: item.medication
          ? {
              brandName: item.medication.brandName,
              genericName: item.medication.genericName,
              route: item.medication.route,
              strength: item.medication.strength,
            }
          : undefined,
        name:
          item.regimen.name ||
          item.medication?.genericName ||
          item.regimen.medicationName ||
          "Unknown Medication",
        prnReason: item.regimen.prnReason,
        route: item.regimen.route || item.medication?.route || "Oral",
        scheduleType: item.regimen.scheduleType,
        timesLocal: item.regimen.timesLocal,
      })) || [],
    [regimensResponse],
  );

  const animalData: EmergencyAnimal | undefined = useMemo(
    () =>
      animalResponse
        ? ({
            ...animalResponse,
            dob: animalResponse.dob ? new Date(animalResponse.dob) : null,
            pendingMeds: regimens?.length || 0,
            photo: animalResponse.photoUrl || null,
            photoUrl: animalResponse.photoUrl || null,
            timezone: animalResponse.timezone || "UTC",
            weightKg: animalResponse.weightKg
              ? Number(animalResponse.weightKg)
              : null,
          } as EmergencyAnimal)
        : undefined,
    [animalResponse, regimens],
  );

  const timezone =
    animalData?.timezone ||
    selectedAnimal?.timezone ||
    selectedHousehold?.timezone ||
    "UTC";

  const age = animalData?.dob ? calculateAge(animalData.dob) : null;

  return {
    age,
    animalData,
    animalId,
    emergencyContacts,
    isLoading: animalLoading || regimensLoading,
    regimens,
    selectedHousehold,
    timezone,
  };
}
