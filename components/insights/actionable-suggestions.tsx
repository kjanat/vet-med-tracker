"use client";

import {
  ArrowRight,
  Check,
  Clock,
  Lightbulb,
  Package,
  RefreshCw,
  Shield,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/server/trpc/client";

interface DatabaseSuggestion {
  id: string;
  type:
    | "ADD_REMINDER"
    | "SHIFT_TIME"
    | "ENABLE_COSIGN"
    | "LOW_INVENTORY"
    | "REFILL_NEEDED";
  summary: string;
  rationale: string;
  priority: "high" | "medium" | "low";
  estimatedImpact: string;
  action: {
    animalId?: string;
    regimenId?: string;
    targetTime?: string;
    dayOfWeek?: number;
    shiftMinutes?: number;
  };
}

const suggestionIcons = {
  ADD_REMINDER: Clock,
  SHIFT_TIME: ArrowRight,
  ENABLE_COSIGN: Shield,
  LOW_INVENTORY: Package,
  REFILL_NEEDED: RefreshCw,
};

const suggestionColors = {
  ADD_REMINDER:
    "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
  SHIFT_TIME:
    "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950",
  ENABLE_COSIGN: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
  LOW_INVENTORY:
    "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
  REFILL_NEEDED:
    "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950",
};

export function ActionableSuggestions() {
  const { selectedHousehold } = useApp();
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const [revertTimers, setRevertTimers] = useState<Map<string, NodeJS.Timeout>>(
    new Map(),
  );

  // Get suggestions from tRPC
  const { data: suggestions = [], refetch: refetchSuggestions } =
    trpc.insights.getSuggestions.useQuery(
      {
        householdId: selectedHousehold?.id || "",
        limit: 10,
      },
      {
        enabled: !!selectedHousehold?.id,
      },
    );

  // Mutations
  const applySuggestionMutation = trpc.insights.applySuggestion.useMutation({
    onSuccess: () => {
      refetchSuggestions();
    },
  });

  const revertSuggestionMutation = trpc.insights.revertSuggestion.useMutation({
    onSuccess: () => {
      refetchSuggestions();
    },
  });

  const handleApplySuggestion = async (suggestion: DatabaseSuggestion) => {
    if (!selectedHousehold?.id) return;

    try {
      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent("insights_suggestion_apply", {
          detail: { suggestionId: suggestion.id, type: suggestion.type },
        }),
      );

      // Apply suggestion via tRPC
      const result = await applySuggestionMutation.mutateAsync({
        householdId: selectedHousehold.id,
        suggestionId: suggestion.id,
      });

      if (result.success) {
        // Mark as applied
        setAppliedSuggestions((prev) => new Set([...prev, suggestion.id]));

        // Set up revert timer (10 minutes)
        const timer = setTimeout(
          () => {
            setAppliedSuggestions((prev) => {
              const next = new Set(prev);
              next.delete(suggestion.id);
              return next;
            });
            setRevertTimers((prev) => {
              const next = new Map(prev);
              next.delete(suggestion.id);
              return next;
            });
          },
          10 * 60 * 1000,
        );

        setRevertTimers((prev) => new Map([...prev, [suggestion.id, timer]]));

        // Show success message
        console.log(`Applied: ${suggestion.summary}`, result.changes);
      }
    } catch (error) {
      console.error("Failed to apply suggestion:", error);
    }
  };

  const handleRevertSuggestion = async (suggestionId: string) => {
    if (!selectedHousehold?.id) return;

    try {
      console.log("Reverting suggestion:", suggestionId);

      // Clear timer
      const timer = revertTimers.get(suggestionId);
      if (timer) {
        clearTimeout(timer);
        setRevertTimers((prev) => {
          const next = new Map(prev);
          next.delete(suggestionId);
          return next;
        });
      }

      // Revert suggestion via tRPC
      const result = await revertSuggestionMutation.mutateAsync({
        householdId: selectedHousehold.id,
        suggestionId,
      });

      if (result.success) {
        setAppliedSuggestions((prev) => {
          const next = new Set(prev);
          next.delete(suggestionId);
          return next;
        });

        console.log("Suggestion reverted", result.changes);
      }
    } catch (error) {
      console.error("Failed to revert suggestion:", error);
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Suggestions
          </CardTitle>
          <CardDescription>
            AI-powered recommendations to improve compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Lightbulb className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mb-2 font-medium text-lg">All good!</h3>
            <p className="text-muted-foreground">
              No suggestions at this time. Keep up the great work!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Suggestions
        </CardTitle>
        <CardDescription>
          AI-powered recommendations to improve compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion) => {
          const Icon =
            suggestionIcons[suggestion.type as keyof typeof suggestionIcons] ||
            Clock;
          const isApplied = appliedSuggestions.has(suggestion.id);

          return (
            <Card
              key={suggestion.id}
              className={`${suggestionColors[suggestion.type as keyof typeof suggestionColors] || suggestionColors.ADD_REMINDER} ${isApplied ? "ring-2 ring-green-500" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="font-medium">{suggestion.summary}</div>
                      <div className="text-muted-foreground text-sm">
                        {suggestion.rationale}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.type.replace("_", " ").toLowerCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {suggestion.priority}
                      </Badge>
                    </div>

                    {isApplied ? (
                      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <AlertDescription className="flex items-center justify-between">
                          <span className="text-green-800 dark:text-green-200">
                            Applied successfully!
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRevertSuggestion(suggestion.id)
                            }
                            className="gap-1"
                            disabled={revertSuggestionMutation.isPending}
                          >
                            <Undo2 className="h-3 w-3" />
                            {revertSuggestionMutation.isPending
                              ? "Reverting..."
                              : "Revert"}
                          </Button>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Button
                        onClick={() => handleApplySuggestion(suggestion)}
                        size="sm"
                        className="w-full"
                        disabled={applySuggestionMutation.isPending}
                      >
                        {applySuggestionMutation.isPending
                          ? "Applying..."
                          : "Apply Suggestion"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
