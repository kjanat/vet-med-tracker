"use client";

import { ArrowLeft, Database, Download, Filter, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AuditEntry } from "@/lib/schemas/audit";
import { trpc } from "@/server/trpc/client";

function AuditLogContent() {
	const router = useRouter();
	const { selectedHouseholdId } = useApp();
	const [filterUser, setFilterUser] = useState("");
	const [filterAction, setFilterAction] = useState("all");
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// Fetch audit logs
	const {
		data: auditData,
		isLoading: isLoadingAudit,
		error: auditError,
	} = trpc.audit.list.useQuery(
		{
			householdId: selectedHouseholdId || "",
			limit: 100,
			action: filterAction === "all" ? undefined : filterAction,
			search: filterUser || undefined,
		},
		{ enabled: !!selectedHouseholdId },
	);

	// Fetch action types for filtering
	const { data: actionTypes } = trpc.audit.getActionTypes.useQuery(
		{ householdId: selectedHouseholdId || "" },
		{ enabled: !!selectedHouseholdId },
	);

	// Format action types for select component
	const actionOptions = useMemo(() => {
		const baseOptions = [{ value: "all", label: "All Actions" }];
		if (actionTypes) {
			return baseOptions.concat(
				actionTypes.map((action) => ({
					value: action,
					label:
						action.charAt(0).toUpperCase() +
						action.slice(1).replace(/[._]/g, " "),
				})),
			);
		}
		return baseOptions;
	}, [actionTypes]);

	// Transform the audit entries to match the expected format
	const auditEntries: AuditEntry[] = useMemo(() => {
		if (!auditData?.entries) return [];

		return auditData.entries.map((entry) => ({
			id: entry.id,
			userId: entry.userId,
			userName: entry.userName || "Unknown User",
			userEmail: entry.userEmail,
			action: entry.action,
			resourceType: entry.resourceType,
			resourceId: entry.resourceId,
			details: entry.details,
			timestamp: entry.timestamp,
			ipAddress: entry.ipAddress,
			userAgent: entry.userAgent,
			sessionId: entry.sessionId,
		}));
	}, [auditData]);

	const handleExport = () => {
		// TODO: Implement export functionality
		console.log("Exporting audit log...");
	};

	// Show loading state
	if (isLoadingAudit) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.push("/settings/data-privacy")}
						className="shrink-0"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="flex-1">
						<h1 className="font-bold text-2xl md:text-3xl">Audit Log</h1>
						<p className="text-muted-foreground text-sm md:text-base">
							View all activity in your household
						</p>
					</div>
				</div>
				<Card>
					<CardContent className="py-8">
						<div className="flex justify-center">
							<Loader2 className="h-8 w-8 animate-spin" />
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Show error state
	if (auditError) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.push("/settings/data-privacy")}
						className="shrink-0"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div className="flex-1">
						<h1 className="font-bold text-2xl md:text-3xl">Audit Log</h1>
						<p className="text-muted-foreground text-sm md:text-base">
							View all activity in your household
						</p>
					</div>
				</div>
				<Card>
					<CardContent className="py-8">
						<div className="text-center text-red-500">
							Failed to load audit log: {auditError.message}
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/settings/data-privacy")}
					className="shrink-0"
				>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div className="flex-1">
					<h1 className="font-bold text-2xl md:text-3xl">Audit Log</h1>
					<p className="text-muted-foreground text-sm md:text-base">
						View all activity in your household
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Database className="h-5 w-5" />
								Activity History
							</CardTitle>
							<CardDescription>
								{auditEntries.length} entries found
							</CardDescription>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							className="gap-2"
						>
							<Download className="h-4 w-4" />
							Export
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Filters */}
					<div className="flex flex-col gap-4 sm:flex-row">
						<div className="flex flex-1 items-center gap-2">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Filter by user..."
								value={filterUser}
								onChange={(e) => setFilterUser(e.target.value)}
								className="flex-1"
							/>
						</div>
						<Select value={filterAction} onValueChange={setFilterAction}>
							<SelectTrigger className="w-full sm:w-[200px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{actionOptions.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Entries */}
					<div className="space-y-3">
						{auditEntries.map((entry) => (
							<div
								key={entry.id}
								className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex-1 space-y-1">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-medium">{entry.userName}</span>
										<Badge variant="outline" className="text-xs">
											{entry.action}
										</Badge>
										{entry.resourceType && (
											<Badge variant="secondary" className="text-xs">
												{entry.resourceType}
											</Badge>
										)}
									</div>
									<div className="text-muted-foreground text-sm">
										{entry.details
											? typeof entry.details === "string"
												? entry.details
												: `${entry.action} on ${entry.resourceType}${entry.resourceId ? ` (${entry.resourceId.slice(0, 8)}...)` : ""}`
											: `${entry.action} on ${entry.resourceType}`}
									</div>
									<div className="text-muted-foreground text-xs">
										{isClient
											? new Date(entry.timestamp).toLocaleString()
											: "..."}
										{entry.ipAddress && ` • ${entry.ipAddress}`}
									</div>
								</div>
							</div>
						))}

						{auditEntries.length === 0 && (
							<div className="py-8 text-center text-muted-foreground">
								<Database className="mx-auto mb-2 h-8 w-8 opacity-50" />
								<p>No audit entries found</p>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function AuditLogPage() {
	return <AuditLogContent />;
}
