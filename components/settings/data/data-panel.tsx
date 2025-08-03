"use client";

import { Database, Download, FileText, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
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

// Mock current user - replace with auth context
const currentUser = { role: "Owner" };

export function DataPanel() {
	const [isExporting, setIsExporting] = useState(false);
	const [isClearing, setIsClearing] = useState(false);
	const [clearConfirm, setClearConfirm] = useState("");
	const [holdProgress, setHoldProgress] = useState(0);

	const canViewAudit = currentUser.role === "Owner";
	const canClearData = currentUser.role === "Owner";

	const handleExport = async (format: "json" | "csv") => {
		setIsExporting(true);
		try {
			console.log(`Exporting data as ${format}`);

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("settings_data_export", {
					detail: { format },
				}),
			);

			// TODO: tRPC mutation
			// const data = await exportData.mutateAsync({
			//   householdId,
			//   format,
			//   from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
			//   to: new Date()
			// })

			// Simulate download
			const filename = `vetmed-export-${new Date().toISOString().split("T")[0]}.${format}`;
			console.log(`Downloaded ${filename}`);

			// Create mock download
			const mockData =
				format === "json"
					? '{"export": "data"}'
					: "Date,Animal,Medication,Status\n";
			const blob = new Blob([mockData], {
				type: format === "json" ? "application/json" : "text/csv",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Export failed:", error);
		} finally {
			setIsExporting(false);
		}
	};

	const handleClearData = async () => {
		if (clearConfirm !== "DELETE" || !canClearData) return;

		setIsClearing(true);
		try {
			console.log("Clearing household history");

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("settings_data_clear", {
					detail: { confirmed: true },
				}),
			);

			// TODO: tRPC mutation with re-auth
			// await clearHistory.mutateAsync({
			//   householdId,
			//   confirm: true
			// })

			setClearConfirm("");
			console.log("History cleared successfully");
		} catch (error) {
			console.error("Failed to clear history:", error);
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
			<div>
				<h2 className="font-bold text-2xl">Data & Privacy</h2>
				<p className="text-muted-foreground">
					Export your data and manage privacy settings
				</p>
			</div>

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
								window.location.href = "/settings/audit-log";
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
