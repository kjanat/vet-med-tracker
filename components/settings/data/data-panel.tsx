"use client";

import { Database, Download, FileText, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

export function DataPanel() {
  const { selectedHousehold, user } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);

  // For now, assume all authenticated users can export data
  // and only check for household selection for data clearing
  const canViewAudit = !!user;
  const canClearData = !!user && !!selectedHousehold;

  const handleExport = async (format: "json" | "csv") => {
    if (!selectedHousehold?.id) {
      console.error("No household selected");
      return;
    }

    setIsExporting(true);
    try {
      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent("settings_data_export", {
          detail: { format },
        }),
      );

      // TODO: Implement export endpoint in reports router
      // Needs to fetch and format:
      // - Administration history
      // - Animal information
      // - Medication regimens
      // - Inventory data
      // Then convert to JSON or CSV format

      alert(
        `Data export to ${format.toUpperCase()} is not yet implemented. This feature is coming soon.`,
      );
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    if (clearConfirm !== "DELETE" || !canClearData || !selectedHousehold?.id) {
      return;
    }

    setIsClearing(true);
    try {
      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent("settings_data_clear", {
          detail: { confirmed: true },
        }),
      );

      // TODO: Implement clearHistory endpoint in household or admin router
      // Should:
      // - Require owner role
      // - Soft delete all administrations
      // - Keep animals, regimens, and inventory intact
      // - Log the action for audit purposes

      alert(
        "Data clearing is not yet implemented. This feature requires additional safety measures and is coming soon.",
      );
      setClearConfirm("");
    } catch (error) {
      console.error("Failed to clear history:", error);
      alert("Failed to clear data. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const startHoldToClear = () => {
    if (clearConfirm !== "DELETE") return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setHoldProgress(0);
        handleClearData();
      }
    }, 30);

    const handleMouseUp = () => {
      clearInterval(interval);
      setHoldProgress(0);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="space-y-6">
      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download your household&apos;s medication data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={isExporting} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Export JSON
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Export Data as JSON</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will export all medication records, inventory, and
                    animal profiles. Times are shown in each animal&apos;s local
                    timezone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleExport("json")}>
                    Export
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isExporting}
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Export CSV
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Export Data as CSV</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will export all medication records, inventory, and
                    animal profiles. Times are shown in each animal&apos;s local
                    timezone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleExport("csv")}>
                    Export
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Exports include all medication records, inventory, and animal
              profiles. Times are shown in each animal&apos;s local timezone.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Clear Data */}
      {canClearData && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Clear History
            </CardTitle>
            <CardDescription>
              Permanently delete all medication records and history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone. All
                medication records, history, and audit logs will be permanently
                deleted. Animal profiles and regimens will be preserved.
              </AlertDescription>
            </Alert>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Clear History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All History?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All medication records,
                    history, and audit logs will be permanently deleted. Animal
                    profiles and regimens will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4 space-y-2">
                  <Label htmlFor="confirm-dialog">
                    Type &quot;DELETE&quot; to confirm
                  </Label>
                  <Input
                    id="confirm-dialog"
                    value={clearConfirm}
                    onChange={(e) => setClearConfirm(e.target.value)}
                    placeholder="DELETE"
                    className="max-w-[200px]"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setClearConfirm("")}>
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={clearConfirm !== "DELETE" || isClearing}
                    onMouseDown={startHoldToClear}
                    className="relative overflow-hidden"
                  >
                    <div
                      className="absolute inset-0 bg-destructive-foreground/20 transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                    <span className="relative">
                      {isClearing
                        ? "Clearing..."
                        : holdProgress > 0
                          ? "Hold to Clear..."
                          : "Hold to Clear"}
                    </span>
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {canViewAudit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Audit Log
            </CardTitle>
            <CardDescription>
              View activity history for your household
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                window.location.href = "/settings/data-privacy/audit";
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              View Audit Log
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
