"use client";

import { AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AnimalFormDialog,
  useAnimalFormDialog,
} from "@/components/forms/animal-form-dialog";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DesktopProductivityToolbar,
  KeyboardShortcutsOverlay,
} from "@/components/ui/desktop-productivity-toolbar";
import { RecordButton } from "@/components/ui/record-button";
import { useDashboardShortcuts } from "@/hooks/dashboard/useDashboardShortcuts";
import {
  computeNextActions,
  type DashboardFilters,
  DEFAULT_FILTERS,
  type SortKey,
  type SortOrder,
  type TransformedRegimen,
} from "@/lib/dashboard/next-actions";

// Inline UTC day range utility
const getUtcDayRange = (date: Date) => {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const endExclusive = new Date(start);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  return { endExclusive, start };
};

import type { Animal } from "@/lib/utils/types";
import { trpc } from "@/server/trpc/client";

export default function DashboardPage() {
  const { selectedAnimal, animals, selectedHousehold, households } = useApp();
  const { openAnimalForm } = useAnimalFormDialog();
  const router = useRouter();

  // Productivity toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("time");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [filters, setFilters] = useState<DashboardFilters>({
    ...DEFAULT_FILTERS,
  });
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  useDashboardShortcuts({
    setFilters,
    setShowKeyboardShortcuts,
  });

  // Get timezone from animal or household context
  const timezone =
    selectedAnimal?.timezone || selectedHousehold?.timezone || "UTC";

  // Fetch due regimens
  const { data: dueRegimens, isLoading } = trpc.regimen.listDue.useQuery(
    {
      householdId: selectedHousehold?.id || "",
      includeUpcoming: true,
    },
    {
      enabled: Boolean(selectedHousehold?.id),
      refetchInterval: 60000,
    },
  );

  // Fetch today's administrations
  const { start: todayStartUtc, endExclusive: todayEndExclusive } =
    getUtcDayRange(new Date());
  const { data: todayAdmins } = trpc.admin.list.useQuery(
    {
      householdId: selectedHousehold?.id || "",
      startDate: todayStartUtc.toISOString(),
      endDate: todayEndExclusive.toISOString(),
    },
    {
      enabled: Boolean(selectedHousehold?.id),
    },
  );

  // Calculate next actions with filtering and sorting
  const nextActions = useMemo(
    () =>
      computeNextActions({
        regimens: dueRegimens,
        filters,
        query: searchQuery,
        sortBy,
        sortOrder,
        timezone,
      }),
    [dueRegimens, filters, searchQuery, sortBy, sortOrder, timezone],
  );

  // Calculate stats
  const todayStats = useMemo(() => {
    if (!todayAdmins || !dueRegimens) {
      return { completed: 0, total: 0, compliance: 0 };
    }
    const completed = todayAdmins.length;
    const totalScheduled = dueRegimens.filter((r) => !r.isPRN).length;
    const total = Math.max(completed, totalScheduled);
    const compliance = total > 0 ? Math.round((completed / total) * 100) : 100;
    return { completed, total, compliance };
  }, [todayAdmins, dueRegimens]);

  // Check if households are still being loaded
  const householdsLoading = households.length === 0 && !selectedHousehold;

  // Loading state
  if ((isLoading && !dueRegimens) || householdsLoading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // No household (only show after households have loaded)
  if (!selectedHousehold && households.length > 0) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">
          Please select a household to view your dashboard
        </p>
      </div>
    );
  }

  // No animals
  if (animals.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-4 font-bold text-3xl">Welcome to VetMed Tracker</h1>
          <p className="mb-8 text-lg text-muted-foreground">
            {
              "Taking care of your pets' health starts here. Add your first pet to begin tracking their medications and health regimens."
            }
          </p>
          <Button
            className="w-full sm:w-auto"
            onClick={() => openAnimalForm()}
            size="lg"
          >
            Add Your First Pet
          </Button>
        </div>
      </div>
    );
  }

  // Single animal view
  if (selectedAnimal) {
    // Convert minimal animal to full Animal type for SingleAnimalView
    const fullAnimal = {
      ...selectedAnimal,
      timezone: selectedAnimal.timezone || timezone, // Use animal's timezone or fallback to calculated timezone
      allergies: [],
      conditions: [],
    };
    return <SingleAnimalView animal={fullAnimal} />;
  }

  // All animals dashboard
  return (
    <>
      {/* Desktop Productivity Toolbar */}
      <div className="hidden md:block">
        <DesktopProductivityToolbar
          filters={filters}
          onFiltersChange={setFilters}
          onKeyboardShortcutsToggle={() =>
            setShowKeyboardShortcuts((open) => !open)
          }
          onSearchChange={setSearchQuery}
          onSortChange={(newSortBy, newOrder) => {
            setSortBy(newSortBy as SortKey);
            setSortOrder(newOrder as SortOrder);
          }}
          searchQuery={searchQuery}
          selectedCount={0}
          sortBy={sortBy}
          sortOrder={sortOrder}
          totalCount={nextActions.length}
        />
      </div>

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        closeAction={() => setShowKeyboardShortcuts(false)}
        isOpen={showKeyboardShortcuts}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Managing {animals.length} animals across all households
          </p>
          <RecordButton className="w-full sm:w-auto" prefilled />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                {"Today's Progress"}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {todayStats.completed}/{todayStats.total}
              </div>
              <p className="text-muted-foreground text-xs">
                medications completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Compliance Rate
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{todayStats.compliance}%</div>
              <p className="text-muted-foreground text-xs">this week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">
                Pending Actions
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">
                {animals.reduce((sum, animal) => sum + animal.pendingMeds, 0)}
              </div>
              <p className="text-muted-foreground text-xs">medications due</p>
            </CardContent>
          </Card>
        </div>

        {/* Next Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Next Actions</CardTitle>
            <CardDescription>
              Medications due soon, sorted by priority
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextActions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>{"No medications due right now!"}</p>
                <p className="text-sm">
                  Check back later or record PRN medications
                </p>
              </div>
            ) : (
              nextActions.map((action) => {
                const foundAnimal = animals.find(
                  (a) => a.id === action.animalId,
                );
                return (
                  <div
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    key={action.id}
                  >
                    {foundAnimal && (
                      <AnimalAvatar animal={foundAnimal} size="md" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="truncate font-medium">
                          {action.animal} - {action.medication}
                        </div>
                        <Badge
                          className="shrink-0"
                          variant={
                            action.status === "overdue"
                              ? "destructive"
                              : action.status === "due"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {action.status}
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {action.route} • Due {action.dueTime}
                      </div>
                    </div>
                    <Button
                      className="w-20 shrink-0"
                      onClick={() =>
                        router.push(
                          `/auth/admin/record?regimenId=${action.id}&from=home` as any,
                        )
                      }
                      size="sm"
                    >
                      Record
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
      <AnimalFormDialog />
    </>
  );
}

function SingleAnimalView({ animal }: { animal: Animal }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AnimalAvatar animal={animal} showBadge size="lg" />
        <div>
          <p className="text-muted-foreground">{animal.species}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Next Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="font-medium">Rimadyl 75mg</div>
              <div className="text-muted-foreground text-sm">
                Due in 2 hours (2:00 PM)
              </div>
              <RecordButton className="mt-4 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Regimens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Pain Management</span>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex justify-between">
                <span>Antibiotics</span>
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
