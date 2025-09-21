"use client";

import { Bell, CheckCircle, Clock, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  type NavigationContext,
  NavigationService,
  type RouterLike,
} from "@/lib/services/navigation.service";
import { formatTimeLocal } from "@/utils/tz";

interface MobileSuccessLayoutProps {
  onReturnHome: () => void;
  onRecordAnother: () => void;
  recordedAt?: string;
  animalName?: string;
  medicationName?: string;
  navigationContext?: NavigationContext;
  regimenId?: string;
}

export const MobileSuccessLayout = memo(function MobileSuccessLayout({
  onReturnHome,
  onRecordAnother,
  recordedAt = new Date().toISOString(),
  animalName,
  medicationName,
  navigationContext,
  regimenId,
}: MobileSuccessLayoutProps) {
  const router = useRouter();

  const handleOpenReminderAdjustment = () => {
    if (navigationContext && regimenId) {
      const url = NavigationService.navigateToReminderSettings({
        ...navigationContext,
        regimenId,
      });
      NavigationService.navigateWithContext(url, router as RouterLike);
    }
  };
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6 text-center">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>

        <h1 className="mb-2 font-bold text-2xl text-green-700">
          Recorded Successfully!
        </h1>

        <div className="space-y-1 text-muted-foreground">
          <p className="text-base">
            {animalName && medicationName
              ? `${animalName} - ${medicationName}`
              : "Medication administration"}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>
              Recorded at{" "}
              {formatTimeLocal(new Date(recordedAt), "America/New_York")} by You
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          className="h-12 w-full text-base"
          onClick={onRecordAnother}
          variant="default"
        >
          Record Another
        </Button>

        <Button
          className="h-12 w-full text-base"
          onClick={onReturnHome}
          variant="outline"
        >
          <Home className="mr-2 h-5 w-5" />
          Back to Home
        </Button>

        <Button
          className="h-12 w-full text-base"
          onClick={handleOpenReminderAdjustment}
          variant="ghost"
        >
          <Bell className="mr-2 h-5 w-5" />
          Adjust Reminder
        </Button>
      </div>

      {/* Additional Info Card */}
      <Card className="mt-6 w-full max-w-sm bg-muted/30">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground text-sm">
            <p className="mb-1 font-medium">Next Steps</p>
            <p>
              Check the History tab to view this administration or set up
              reminders for future doses.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
