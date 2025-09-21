"use client";

import {
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Home,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type NavigationContext,
  NavigationService,
  type RouterLike,
} from "@/lib/services/navigation.service";
import { formatTimeLocal } from "@/utils/tz";

interface TabletSuccessLayoutProps {
  onReturnHome: () => void;
  onRecordAnother: () => void;
  recordedAt?: string;
  animalName?: string;
  medicationName?: string;
  navigationContext?: NavigationContext;
  regimenId?: string;
}

export const TabletSuccessLayout = memo(function TabletSuccessLayout({
  onReturnHome,
  onRecordAnother,
  recordedAt = new Date().toISOString(),
  animalName,
  medicationName,
  navigationContext,
  regimenId,
}: TabletSuccessLayoutProps) {
  const router = useRouter();
  const [_showReminderAdjustment, setShowReminderAdjustment] = useState(false);

  const handleNavigateToHistory = () => {
    if (navigationContext) {
      const url = NavigationService.navigateToHistory(navigationContext);
      NavigationService.navigateWithContext(url, router as RouterLike);
    }
  };

  const handleNavigateToInsights = () => {
    if (navigationContext) {
      const url = NavigationService.navigateToInsights(navigationContext);
      NavigationService.navigateWithContext(url, router as RouterLike);
    }
  };

  const handleOpenReminderAdjustment = () => {
    if (navigationContext && regimenId) {
      const url = NavigationService.navigateToReminderSettings({
        ...navigationContext,
        regimenId,
      });
      NavigationService.navigateWithContext(url, router as RouterLike);
    } else {
      // Fallback: show inline reminder adjustment
      setShowReminderAdjustment(true);
    }
  };
  return (
    <div className="flex h-full">
      {/* Left column - Success message and details */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md space-y-6 text-center">
          {/* Success Icon */}
          <div>
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>

            <h1 className="mb-3 font-bold text-3xl text-green-700">
              Successfully Recorded!
            </h1>

            <div className="space-y-2 text-muted-foreground">
              {animalName && medicationName && (
                <p className="font-medium text-foreground text-lg">
                  {animalName} - {medicationName}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                <span>
                  Recorded at{" "}
                  {formatTimeLocal(new Date(recordedAt), "America/New_York")} by
                  You
                </span>
              </div>
            </div>
          </div>

          {/* Status card */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-600" />
                <span className="font-medium text-green-800 text-sm">
                  Administration recorded successfully
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right column - Actions and next steps */}
      <div className="w-80 shrink-0 border-l bg-muted/30">
        <div className="flex h-full flex-col p-6">
          <div className="mb-6">
            <h3 className="mb-2 font-semibold text-lg">What&apos;s Next?</h3>
            <p className="text-muted-foreground text-sm">
              Choose your next action or return to the home screen to see
              updated medication schedules.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8 space-y-3">
            <Button
              className="h-12 w-full justify-start text-base"
              onClick={onRecordAnother}
              variant="default"
            >
              <RotateCcw className="mr-3 h-5 w-5" />
              Record Another Medication
            </Button>

            <Button
              className="h-12 w-full justify-start text-base"
              onClick={onReturnHome}
              variant="outline"
            >
              <Home className="mr-3 h-5 w-5" />
              Back to Dashboard
            </Button>

            <Button
              className="h-12 w-full justify-start text-base"
              onClick={handleOpenReminderAdjustment}
              variant="ghost"
            >
              <Bell className="mr-3 h-5 w-5" />
              Adjust Reminders
            </Button>
          </div>

          <div className="flex-1" />

          {/* Additional options */}
          <div className="space-y-4">
            <Card className="bg-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4 pt-0">
                <Button
                  className="h-8 w-full justify-start text-sm"
                  onClick={handleNavigateToHistory}
                  size="sm"
                  variant="ghost"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  View History
                </Button>
                <Button
                  className="h-8 w-full justify-start text-sm"
                  onClick={handleNavigateToInsights}
                  size="sm"
                  variant="ghost"
                >
                  📊 View Insights
                </Button>
              </CardContent>
            </Card>

            <div className="text-center text-muted-foreground text-xs">
              This administration has been logged and will appear in your
              medication history.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
