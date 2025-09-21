"use client";

import { Database, Download, FileText, Shield, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { useApiErrorHandler } from "@/hooks/shared/useErrorHandler";
import { trpc } from "@/server/trpc/client";

export function DataPanel() {
  const router = useRouter();
  const { selectedHousehold, user } = useApp();
  const [isExporting, setIsExporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearConfirm, setClearConfirm] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);

  // Error handling
  const { handleMutationError } = useApiErrorHandler();

  // tRPC mutations
  const exportData = trpc.reports.exportHouseholdData.useMutation();
  const clearHistory = trpc.household.clearHistory.useMutation();

  // For now, assume all authenticated users can export data
  // and only check for household selection for data clearing
  const canViewAudit = Boolean(user);
  const canClearData = Boolean(user) && Boolean(selectedHousehold);

  const handleExport = async (format: "json" | "csv") => {
    if (!selectedHousehold?.id) {
      handleMutationError(new Error("No household selected"), "export-data", {
        showToast: true,
        toastTitle: "Export Failed",
      });
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

      const result = await exportData.mutateAsync({
        format,
        householdId: selectedHousehold.id,
      });

      // Create and trigger download
      const blob = new Blob([result.data], { type: result.contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success notification using toast instead of alert
      alert(`Data exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      handleMutationError(error, "export-data", {
        showToast: true,
        toastTitle: "Export Failed",
      });
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

      const result = await clearHistory.mutateAsync({
        householdId: selectedHousehold.id,
      });

      alert(
        `History cleared successfully. ${result.summary.administrationsDeleted} administrations, ${result.summary.auditLogsDeleted} audit logs, and ${result.summary.notificationsDeleted} notifications were removed.`,
      );
      setClearConfirm("");
    } catch (error) {
      handleMutationError(error, "clear-history", {
        showToast: true,
        toastTitle: "Clear Data Failed",
      });
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
                <Button className="gap-2" disabled={isExporting}>
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
                  className="gap-2"
                  disabled={isExporting}
                  variant="outline"
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
                <Button className="gap-2" variant="destructive">
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
                    className="max-w-[200px]"
                    id="confirm-dialog"
                    onChange={(e) => setClearConfirm(e.target.value)}
                    placeholder="DELETE"
                    value={clearConfirm}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setClearConfirm("")}>
                    Cancel
                  </AlertDialogCancel>
                  <Button
                    className="relative overflow-hidden"
                    disabled={clearConfirm !== "DELETE" || isClearing}
                    onMouseDown={startHoldToClear}
                    variant="destructive"
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
              className="gap-2"
              onClick={() => {
                router.push("/auth/settings/data-privacy/audit");
              }}
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
