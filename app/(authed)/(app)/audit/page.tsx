"use client";

import { ArrowLeft, Database, Download, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

interface AuditEntry {
	id: string;
	userId: string;
	userName: string;
	action: string;
	details: string;
	timestamp: Date;
	ipAddress?: string;
}

// Mock audit data - replace with tRPC
const mockAuditEntries: AuditEntry[] = [
	{
		id: "1",
		userId: "user-1",
		userName: "John Smith",
		action: "admin.create",
		details: "Recorded Rimadyl for Buddy",
		timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
		ipAddress: "192.168.1.100",
	},
	{
		id: "2",
		userId: "user-2",
		userName: "Jane Doe",
		action: "inventory.set_in_use",
		details: "Set Insulin as in use for Whiskers",
		timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
		ipAddress: "192.168.1.101",
	},
	{
		id: "3",
		userId: "user-1",
		userName: "John Smith",
		action: "regimen.create",
		details: "Created PRN regimen for Buddy - Pain Relief",
		timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
		ipAddress: "192.168.1.100",
	},
	{
		id: "4",
		userId: "user-2",
		userName: "Jane Doe",
		action: "admin.edit",
		details: "Updated administration time for Whiskers - Insulin",
		timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
		ipAddress: "192.168.1.101",
	},
	{
		id: "5",
		userId: "user-1",
		userName: "John Smith",
		action: "inventory.add",
		details: "Added Rimadyl 75mg - 30 tablets",
		timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
		ipAddress: "192.168.1.100",
	},
];

const actionTypes = [
	{ value: "all", label: "All Actions" },
	{ value: "admin", label: "Administrations" },
	{ value: "inventory", label: "Inventory" },
	{ value: "regimen", label: "Regimens" },
	{ value: "animal", label: "Animals" },
	{ value: "household", label: "Household" },
];

function AuditLogContent() {
	const router = useRouter();
	const [auditEntries] = useState(mockAuditEntries);
	const [filterUser, setFilterUser] = useState("");
	const [filterAction, setFilterAction] = useState("all");
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const filteredEntries = auditEntries.filter((entry) => {
		if (
			filterUser &&
			!entry.userName.toLowerCase().includes(filterUser.toLowerCase())
		) {
			return false;
		}
		if (filterAction !== "all" && !entry.action.startsWith(filterAction)) {
			return false;
		}
		return true;
	});

	const handleExport = () => {
		// TODO: Implement export functionality
		console.log("Exporting audit log...");
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => router.push("/settings")}
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
								{filteredEntries.length} entries found
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
								{actionTypes.map((type) => (
									<SelectItem key={type.value} value={type.value}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Entries */}
					<div className="space-y-3">
						{filteredEntries.map((entry) => (
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
									</div>
									<div className="text-muted-foreground text-sm">
										{entry.details}
									</div>
									<div className="text-muted-foreground text-xs">
										{isClient ? entry.timestamp.toLocaleString() : "..."}
										{entry.ipAddress && ` • ${entry.ipAddress}`}
									</div>
								</div>
							</div>
						))}

						{filteredEntries.length === 0 && (
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
