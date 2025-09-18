"use client";

import { BarChart3, Download, RefreshCw, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
// Use lazy loading for heavy chart components
import {
  LazyAdministrationTimelineWidget,
  LazyAnimalActivityWidget,
  LazyComplianceHeatmap,
  LazyComplianceRateWidget,
  LazyInventoryLevelsWidget,
  LazyMedicationDistributionWidget,
} from "@/components/optimized/LazyComponents";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  type DateRange,
  getDateRangeFromPeriod,
  PERIOD_OPTIONS,
  type Period,
  useDashboardRefresh,
} from "@/hooks/dashboard/useDashboardData";
import { useToast } from "@/hooks/shared/use-toast";
import { DashboardLayout, type DashboardWidget } from "./DashboardLayout";
import { DateRangeSelector } from "./DateRangeSelector";
import { UpcomingDosesWidget } from "./widgets/UpcomingDosesWidget";

interface ReportingDashboardProps {
  className?: string;
}

export function ReportingDashboard({ className }: ReportingDashboardProps) {
  const { selectedHousehold } = useApp();
  const refreshDashboard = useDashboardRefresh();
  const { toast } = useToast();
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(new Date());

  // State management
  const DEFAULT_PERIOD_VALUE = "30d"; // Last 30 days
  const defaultPeriod =
    PERIOD_OPTIONS.find((p) => p.value === DEFAULT_PERIOD_VALUE) ??
    PERIOD_OPTIONS[0];

  if (!defaultPeriod) {
    throw new Error("No period options available");
  }

  const [selectedPeriod, setSelectedPeriod] = useState<Period>(defaultPeriod);
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getDateRangeFromPeriod(defaultPeriod),
  );

  // Handle date range changes
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange);
  }, []);

  const handlePeriodChange = useCallback((period: Period) => {
    setSelectedPeriod(period);
  }, []);

  // Handle dashboard refresh
  const handleRefresh = useCallback(() => {
    refreshDashboard();
    setLastUpdatedAt(new Date());

    // Fire analytics event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dashboard:refresh", {
          detail: { timestamp: Date.now() },
        }),
      );
    }
  }, [refreshDashboard]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => {
      refreshDashboard();
      setLastUpdatedAt(new Date());
    }, 5 * 60000);
    return () => clearInterval(id);
  }, [refreshDashboard]);

  // Handle export functionality
  const handleExport = useCallback(
    (format: "pdf" | "csv" | "excel") => {
      // Fire analytics event
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("dashboard:export", {
            detail: { dateRange, format, timestamp: Date.now() },
          }),
        );
      }

      toast({
        description: `Generating ${format.toUpperCase()} for selected range...`,
        title: "Export started",
      });
      // TODO: trigger server-side export job and show progress
    },
    [dateRange, toast],
  );

  // Define dashboard widgets
  const widgets = useMemo<DashboardWidget[]>(
    () => [
      {
        component: ({ isFullscreen }) => (
          <LazyComplianceRateWidget
            dateRange={dateRange}
            isFullscreen={isFullscreen}
          />
        ),
        defaultExpanded: true,
        id: "compliance-rate",
        minHeight: 320,
        title: "Compliance Rate Trend",
      },
      {
        component: ({ isFullscreen }) => (
          <LazyAdministrationTimelineWidget
            isFullscreen={isFullscreen}
            period={selectedPeriod}
          />
        ),
        defaultExpanded: true,
        id: "administration-timeline",
        minHeight: 320,
        title: "Administration Timeline",
      },
      {
        component: ({ isFullscreen }) => (
          <LazyMedicationDistributionWidget isFullscreen={isFullscreen} />
        ),
        defaultExpanded: true,
        id: "medication-distribution",
        minHeight: 300,
        title: "Medication Distribution",
      },
      {
        component: ({ isFullscreen }) => (
          <LazyAnimalActivityWidget
            dateRange={dateRange}
            isFullscreen={isFullscreen}
          />
        ),
        defaultExpanded: true,
        id: "animal-activity",
        minHeight: 350,
        title: "Animal Activity Ranking",
      },
      {
        component: ({ isFullscreen }) => (
          <LazyInventoryLevelsWidget isFullscreen={isFullscreen} />
        ),
        defaultExpanded: true,
        id: "inventory-levels",
        minHeight: 320,
        title: "Inventory Status",
      },
      {
        component: ({ isFullscreen }) => (
          <UpcomingDosesWidget isFullscreen={isFullscreen} />
        ),
        defaultExpanded: true,
        id: "upcoming-doses",
        minHeight: 300,
        title: "Upcoming Doses Calendar",
      },
      {
        component: ({ isFullscreen }) => (
          <div className={isFullscreen ? "h-full" : ""}>
            <LazyComplianceHeatmap
              onRangeChange={handleDateRangeChange}
              range={dateRange}
            />
          </div>
        ),
        defaultExpanded: false, // Collapsed by default due to complexity
        id: "compliance-heatmap",
        minHeight: 400,
        title: "Compliance Heatmap",
      },
    ],
    [dateRange, selectedPeriod, handleDateRangeChange],
  );

  // Show message if no household is selected
  if (!selectedHousehold) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reporting Dashboard
          </CardTitle>
          <CardDescription>
            Advanced analytics and insights for your veterinary practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Please select a household to view reporting dashboard
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Dashboard Header */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-bold text-2xl">
              <BarChart3 className="h-6 w-6" />
              Reporting Dashboard
            </h1>
            <p className="text-muted-foreground">
              Analytics and insights for {selectedHousehold.name}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              className="gap-2"
              onClick={handleRefresh}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2" size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Export...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <DateRangeSelector
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            onPeriodChange={handlePeriodChange}
            selectedPeriod={selectedPeriod}
          />

          <div className="text-muted-foreground text-sm">
            {widgets.length} widgets • Last updated:{" "}
            {lastUpdatedAt.toLocaleTimeString()}
          </div>
        </div>

        <Separator />
      </div>

      {/* Dashboard Grid */}
      <DashboardLayout gap={4} widgets={widgets} />

      {/* Footer */}
      <div className="mt-8 text-center text-muted-foreground text-sm">
        <p>
          Dashboard automatically refreshes every 5 minutes. Data includes all
          households you have access to.
        </p>
      </div>
    </div>
  );
}
