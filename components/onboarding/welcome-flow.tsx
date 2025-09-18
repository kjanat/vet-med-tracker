"use client";

import { CheckCircle, Clock, Heart, Home } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUserPreferencesContext } from "@/components/providers/app-provider-consolidated";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import { trpc } from "@/server/trpc/client";
import { BROWSER_ZONE } from "@/utils/timezone-helpers";

interface OnboardingData {
  householdName: string;
  timezone: string;
  preferredPhoneNumber: string;
  veterinarianName: string;
  veterinarianPhone: string;
  emailReminders: boolean;
  pushNotifications: boolean;
}

const initialData: OnboardingData = {
  emailReminders: true,
  householdName: "",
  preferredPhoneNumber: "",
  pushNotifications: true,
  timezone: BROWSER_ZONE || "America/New_York",
  veterinarianName: "",
  veterinarianPhone: "",
};

export function WelcomeFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const {
    updateVetMedPreferences,
    updateHouseholdSettings,
    markOnboardingComplete,
  } = useUserPreferencesContext();

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const createHouseholdMutation = trpc.household.create.useMutation();

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Create household in database - household variable unused but preserved for future use
      const _household = await createHouseholdMutation.mutateAsync({
        name: data.householdName,
        timezone: data.timezone,
      });

      // Update VetMed preferences
      await updateVetMedPreferences({
        defaultTimezone: data.timezone,
        displayPreferences: {
          temperatureUnit: "fahrenheit",
          use24HourTime: false,
          weightUnit: "lbs",
        },
        notificationPreferences: {
          emailReminders: data.emailReminders,
          pushNotifications: data.pushNotifications,
          reminderLeadTime: 15,
          smsReminders: false,
        },
        preferredPhoneNumber: data.preferredPhoneNumber,
      });

      // Update household settings
      await updateHouseholdSettings({
        defaultLocation: {
          address: "",
          city: "",
          state: "",
          timezone: data.timezone,
          zipCode: "",
        },
        householdRoles: ["Owner", "Primary Caregiver"],
        inventoryPreferences: {
          autoReorderEnabled: false,
          expirationWarningDays: 30,
          lowStockThreshold: 7,
        },
        preferredVeterinarian: {
          address: "",
          name: data.veterinarianName,
          phone: data.veterinarianPhone,
        },
        primaryHouseholdName: data.householdName,
      });

      // Mark onboarding as complete
      await markOnboardingComplete();

      toast.success("Welcome to VetMed Tracker! Your profile has been set up.");
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast.error(
        "There was an error setting up your profile. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <Heart className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Welcome to VetMed Tracker!</CardTitle>
              <CardDescription>
                Let's set up your profile to provide the best medication
                tracking experience for your pets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="household-name">
                  What should we call your household?
                </Label>
                <Input
                  id="household-name"
                  onChange={(e) =>
                    updateData({ householdName: e.target.value })
                  }
                  placeholder="The Smith Family"
                  value={data.householdName}
                />
                <p className="text-muted-foreground text-sm">
                  This helps us personalize your experience and organize your
                  pets' information.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <Clock className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Time &amp; Location</CardTitle>
              <CardDescription>
                Set your timezone to ensure accurate medication schedules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Your Timezone</Label>
                <TimezoneCombobox
                  onChange={(value) => updateData({ timezone: value })}
                  placeholder="Select your timezone"
                  required
                  value={data.timezone}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  onChange={(e) =>
                    updateData({ preferredPhoneNumber: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                  type="tel"
                  value={data.preferredPhoneNumber}
                />
                <p className="text-muted-foreground text-sm">
                  We'll use this for SMS reminders if you enable them later.
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <Home className="h-12 w-12 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Veterinary Information</CardTitle>
              <CardDescription>
                Add your preferred veterinarian for quick access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vet-name">
                  Veterinarian/Clinic Name (Optional)
                </Label>
                <Input
                  id="vet-name"
                  onChange={(e) =>
                    updateData({ veterinarianName: e.target.value })
                  }
                  placeholder="Dr. Johnson's Animal Hospital"
                  value={data.veterinarianName}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vet-phone">Veterinarian Phone (Optional)</Label>
                <Input
                  id="vet-phone"
                  onChange={(e) =>
                    updateData({ veterinarianPhone: e.target.value })
                  }
                  placeholder="+1 (555) 987-6543"
                  type="tel"
                  value={data.veterinarianPhone}
                />
              </div>

              <p className="text-muted-foreground text-sm">
                You can always add or update this information later in your
                profile settings.
              </p>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>You're All Set!</CardTitle>
              <CardDescription>
                Your VetMed Tracker profile is ready. You can always update
                these settings later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Household:</span>
                  <span>{data.householdName || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Timezone:</span>
                  <span>{data.timezone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Phone:</span>
                  <span>{data.preferredPhoneNumber || "Not provided"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Veterinarian:</span>
                  <span>{data.veterinarianName || "Not specified"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <Progress className="w-full" value={progress} />
          <p className="text-center text-muted-foreground text-sm">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {renderStep()}

        <div className="flex justify-between">
          <Button
            disabled={currentStep === 1}
            onClick={prevStep}
            variant="outline"
          >
            Previous
          </Button>

          {currentStep < totalSteps ? (
            <Button
              disabled={currentStep === 1 && !data.householdName.trim()}
              onClick={nextStep}
            >
              Next
            </Button>
          ) : (
            <Button disabled={isLoading} onClick={completeOnboarding}>
              {isLoading ? "Setting up..." : "Complete Setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
