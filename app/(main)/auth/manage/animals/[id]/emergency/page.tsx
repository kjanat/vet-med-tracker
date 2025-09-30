"use client";

import { AlertTriangle, Loader2, Phone, Pill } from "lucide-react";

import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmergencyCardData } from "@/hooks/shared/useEmergencyCardData";
import { EmergencyDialService } from "@/lib/services/emergency-dial.service";
import type { EmergencyAnimal, EmergencyRegimen } from "@/lib/utils/types";

// Helper components to reduce cognitive complexity
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Card className="max-w-md">
      <CardContent className="pt-6">
        <p className="text-center text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  </div>
);

const LoadingState = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex items-center gap-2">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-lg">Loading emergency card...</span>
    </div>
  </div>
);

const AnimalInfoCard = ({
  animalData,
  age,
}: {
  animalData: EmergencyAnimal;
  age: number | null;
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-3">
        <AnimalAvatar
          animal={{
            ...animalData,
            pendingMeds: animalData.pendingMeds || 0,
          }}
          size="lg"
        />
        <div>
          <div className="text-xl sm:text-2xl">{animalData.name}</div>
          <div className="text-base text-muted-foreground sm:text-lg">
            {animalData.breed && `${animalData.breed} `}
            {animalData.species}
          </div>
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {animalData.sex && (
          <div>
            <span className="font-medium">Sex:</span> {animalData.sex}
            {animalData.neutered && " (Neutered)"}
          </div>
        )}
        {animalData.weightKg && (
          <div>
            <span className="font-medium">Weight:</span> {animalData.weightKg}kg
          </div>
        )}
        {age !== null && (
          <div>
            <span className="font-medium">Age:</span> {age} year
            {age !== 1 ? "s" : ""}
          </div>
        )}
        {animalData.color && (
          <div>
            <span className="font-medium">Color:</span> {animalData.color}
          </div>
        )}
        {animalData.microchipId && (
          <div className="col-span-2">
            <span className="font-medium">Microchip:</span>{" "}
            {animalData.microchipId}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const EmergencyContactsCard = ({
  animalData,
  emergencyContacts = [],
  canMakePhoneCalls,
}: {
  animalData: EmergencyAnimal;
  emergencyContacts?: Array<{
    id: string;
    contactName: string;
    contactPhone: string;
    relationship?: string;
    isPrimary: boolean;
  }>;
  canMakePhoneCalls: boolean;
}) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Phone className="h-5 w-5" />
        Emergency Contacts
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Primary Veterinarian */}
        <div className="rounded-lg border p-3 sm:p-4">
          <div className="font-medium text-base sm:text-lg">
            Primary Veterinarian
          </div>
          <div className="font-bold text-lg sm:text-xl">
            {animalData.vetName || "Not specified"}
          </div>
          <div className="text-base sm:text-lg">
            {animalData.vetPhone ? (
              <div className="flex items-center gap-2">
                <span>
                  {EmergencyDialService.formatPhoneForDisplay(
                    animalData.vetPhone,
                  )}
                </span>
                {canMakePhoneCalls && (
                  <Button
                    className="ml-auto"
                    onClick={() =>
                      EmergencyDialService.dialVeterinarian(
                        animalData.vetPhone || "",
                      )
                    }
                    size="sm"
                    variant="destructive"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              "Not specified"
            )}
          </div>
        </div>

        {/* Emergency Contacts */}
        {emergencyContacts.length > 0 ? (
          emergencyContacts.slice(0, 1).map((contact) => (
            <div className="rounded-lg border p-3 sm:p-4" key={contact.id}>
              <div className="font-medium text-base sm:text-lg">
                {contact.relationship || "Emergency Contact"}
                {contact.isPrimary && " (Primary)"}
              </div>
              <div className="font-bold text-lg sm:text-xl">
                {contact.contactName}
              </div>
              <div className="text-base sm:text-lg">
                <div className="flex items-center gap-2">
                  <span>
                    {EmergencyDialService.formatPhoneForDisplay(
                      contact.contactPhone,
                    )}
                  </span>
                  {canMakePhoneCalls && (
                    <Button
                      className="ml-auto"
                      onClick={() =>
                        EmergencyDialService.dialEmergencyContact(
                          contact.contactPhone || "",
                        )
                      }
                      size="sm"
                      variant="destructive"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border p-3 sm:p-4">
            <div className="font-medium text-base sm:text-lg">
              Emergency Contact
            </div>
            <div className="font-bold text-lg sm:text-xl">Not specified</div>
            <div className="text-base sm:text-lg">Not specified</div>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

const MedicalAlertsCard = ({ animalData }: { animalData: EmergencyAnimal }) => {
  const hasAlerts =
    (animalData.allergies && animalData.allergies.length > 0) ||
    (animalData.conditions && animalData.conditions.length > 0);

  if (!hasAlerts) return null;

  return (
    <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 print:bg-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 print:text-black">
          <AlertTriangle className="h-5 w-5" />
          Medical Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {animalData.allergies && animalData.allergies.length > 0 && (
          <div className="mb-4">
            <div className="mb-2 font-medium text-red-700 dark:text-red-400 print:text-black">
              ALLERGIES:
            </div>
            <div className="flex flex-wrap gap-2">
              {animalData.allergies.map((allergy) => (
                <Badge
                  className="text-sm print:bg-gray-300 print:text-black"
                  key={allergy}
                  variant="destructive"
                >
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {animalData.conditions && animalData.conditions.length > 0 && (
          <div>
            <div className="mb-2 font-medium text-red-700 dark:text-red-400 print:text-black">
              CONDITIONS:
            </div>
            <div className="flex flex-wrap gap-2">
              {animalData.conditions.map((condition) => (
                <Badge
                  className="text-sm print:bg-gray-300 print:text-black"
                  key={condition}
                  variant="secondary"
                >
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MedicationsCard = ({ regimens }: { regimens: EmergencyRegimen[] }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Pill className="h-5 w-5" />
        Current Medications
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {regimens.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            No active medications
          </p>
        ) : (
          regimens.map((regimen) => (
            <div className="rounded-lg border p-3 sm:p-4" key={regimen.id}>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-base sm:text-lg">
                    {regimen.medication?.genericName ||
                      regimen.medication?.brandName ||
                      regimen.name}
                  </div>
                  <div className="text-muted-foreground">
                    {regimen.medication?.strength &&
                      `${regimen.medication.strength} • `}
                    {regimen.route || regimen.medication?.route || "Oral"}
                  </div>
                </div>
                <Badge variant="outline">
                  {regimen.scheduleType === "PRN"
                    ? `PRN - ${regimen.prnReason || "As needed"}`
                    : regimen.timesLocal?.join(", ") || "See instructions"}
                </Badge>
              </div>
              {regimen.instructions && (
                <div className="text-muted-foreground text-sm">
                  <span className="font-medium">Instructions:</span>{" "}
                  {regimen.instructions}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </CardContent>
  </Card>
);

export default function EmergencyCardPage() {
  const {
    animalData,
    regimens,
    emergencyContacts,
    isLoading,
    timezone,
    age,
    selectedHousehold,
  } = useEmergencyCardData();

  // Check if device can make phone calls
  const canMakePhoneCalls = EmergencyDialService.canMakePhoneCalls();

  const handlePrint = () => window.print();

  // Early returns for different states
  if (!selectedHousehold) {
    return (
      <EmptyState message="Please select a household to view this emergency card." />
    );
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!animalData) {
    return (
      <EmptyState message="Animal not found or you don't have access to this animal." />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Print Button - hidden when printing */}
      <div className="no-print border-b p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="font-bold text-2xl">
            Emergency Card - {animalData.name}
          </h1>
          <Button onClick={handlePrint}>Print Card</Button>
        </div>
      </div>

      {/* Emergency Card Content */}
      <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8 print:p-4">
        <div className="rounded-lg border-2 border-red-500 p-4 sm:p-6 print:border-black">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="mb-2 font-bold text-2xl text-red-600 sm:text-3xl print:text-black">
              EMERGENCY CARD
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Keep this information accessible at all times
            </p>
          </div>

          <AnimalInfoCard age={age} animalData={animalData} />
          <EmergencyContactsCard
            animalData={animalData}
            canMakePhoneCalls={canMakePhoneCalls}
            emergencyContacts={emergencyContacts?.map((contact: any) => ({
              id: contact.id,
              contactName: contact.contactName,
              contactPhone: contact.contactPhone,
              relationship: contact.relationship || undefined,
              isPrimary: contact.isPrimary || false,
            }))}
          />
          <MedicalAlertsCard animalData={animalData} />
          <MedicationsCard regimens={regimens} />

          {/* Footer */}
          <div className="border-t pt-4 text-center text-muted-foreground text-sm">
            <p>
              Generated on{" "}
              {new Date().toLocaleDateString("en-US", { timeZone: timezone })} •
              Keep this card updated
            </p>
            <p className="mt-2">
              In case of emergency, contact your veterinarian immediately
            </p>
          </div>
        </div>
      </div>

      <style global jsx>{`
				@media print {
					.no-print {
						display: none !important;
					}

					body {
						-webkit-print-color-adjust: exact;
						color-adjust: exact;
						background: white !important;
						color: black !important;
					}

					.print:bg-gray-100 {
						background-color: #f3f4f6 !important;
					}

					.print:bg-gray-300 {
						background-color: #d1d5db !important;
					}

					.print:text-black {
						color: #000000 !important;
					}

					.print:border-black {
						border-color: #000000 !important;
					}

					/* Force light theme colors for print */
					.bg-background {
						background-color: white !important;
					}

					.text-muted-foreground {
						color: #6b7280 !important;
					}

					.border {
						border-color: #e5e7eb !important;
					}
				}
			`}</style>
    </div>
  );
}
