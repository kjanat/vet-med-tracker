"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import type { EmergencyAnimal, EmergencyRegimen } from "@/lib/utils/types";
import { trpc } from "@/server/trpc/client";

const calculateAge = (dob: Date | string | null) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const ageInMilliseconds = Date.now() - birthDate.getTime();
  const ageInYears = ageInMilliseconds / (365.25 * 24 * 60 * 60 * 1000);
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
    );

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
            weightKg: animalResponse.weightKg
              ? Number(animalResponse.weightKg)
              : null,
          } as EmergencyAnimal)
        : undefined,
    [animalResponse, regimens],
  );

  const timezone =
    animalResponse?.timezone ||
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
