"use client";

/**
 * Comprehensive demo showcasing all bulk selection features.
 * This component demonstrates various use cases and customization options.
 */

import { Archive, Plus, Search, Share } from "lucide-react";
import { useState } from "react";
import { BulkSelectionProvider } from "@/components/providers/bulk-selection-provider";
import { Badge } from "@/components/ui/badge";
import {
	type BulkSelectionColumn,
	BulkSelectionTable,
} from "@/components/ui/bulk-selection-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBulkSelectionIntegration } from "@/hooks/shared/use-bulk-selection-integration";
import { useToast } from "@/hooks/shared/use-toast";

// Demo data interfaces
interface DemoItem {
	id: string;
	name: string;
	category: "work" | "personal" | "urgent";
	status: "pending" | "in-progress" | "completed";
	priority: "low" | "medium" | "high";
	assignee: string;
	dueDate: Date;
	tags: string[];
}

// Sample data
const generateDemoData = (): DemoItem[] => [
	{
		id: "1",
		name: "Review quarterly reports",
		category: "work",
		status: "pending",
		priority: "high",
		assignee: "John Doe",
		dueDate: new Date(2024, 2, 15),
		tags: ["finance", "quarterly"],
	},
	{
		id: "2",
		name: "Plan team retreat",
		category: "work",
		status: "in-progress",
		priority: "medium",
		assignee: "Jane Smith",
		dueDate: new Date(2024, 2, 20),
		tags: ["team", "event"],
	},
	{
		id: "3",
		name: "Update personal website",
		category: "personal",
		status: "pending",
		priority: "low",
		assignee: "Mike Johnson",
		dueDate: new Date(2024, 2, 25),
		tags: ["web", "personal"],
	},
	{
		id: "4",
		name: "Emergency security patch",
		category: "urgent",
		status: "completed",
		priority: "high",
		assignee: "Sarah Wilson",
		dueDate: new Date(2024, 2, 10),
		tags: ["security", "urgent"],
	},
	{
		id: "5",
		name: "Client presentation prep",
		category: "work",
		status: "in-progress",
		priority: "high",
		assignee: "David Brown",
		dueDate: new Date(2024, 2, 18),
		tags: ["client", "presentation"],
	},
];

function BulkSelectionDemoContent() {
	const { toast } = useToast();
	const [data, setData] = useState<DemoItem[]>(generateDemoData());
	const [searchQuery, setSearchQuery] = useState("");
	const [showCustomActions, setShowCustomActions] = useState(true);
	const [highlightSelected, setHighlightSelected] = useState(true);

	// Filter data based on search
	const filteredData = data.filter(
		(item) =>
			item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.tags.some((tag) =>
				tag.toLowerCase().includes(searchQuery.toLowerCase()),
			),
	);

	// Use bulk selection integration
	const { selectedItems, selectionCount } = useBulkSelectionIntegration({
		data: filteredData,
		getItemId: (item) => item.id,
		onSelectionChange: (selectedItems, _selectedIds) => {
			console.log("Selection changed:", {
				count: selectedItems.length,
				items: selectedItems,
			});
		},
	});

	// Define table columns
	const columns: BulkSelectionColumn<DemoItem>[] = [
		{
			key: "name",
			title: "Task Name",
			render: (item) => (
				<div>
					<div className="font-medium">{item.name}</div>
					<div className="text-muted-foreground text-sm">{item.assignee}</div>
				</div>
			),
		},
		{
			key: "category",
			title: "Category",
			render: (item) => (
				<Badge
					variant={
						item.category === "urgent"
							? "destructive"
							: item.category === "work"
								? "default"
								: "secondary"
					}
				>
					{item.category}
				</Badge>
			),
		},
		{
			key: "status",
			title: "Status",
			render: (item) => (
				<Badge
					variant={
						item.status === "completed"
							? "default"
							: item.status === "in-progress"
								? "secondary"
								: "outline"
					}
				>
					{item.status.replace("-", " ")}
				</Badge>
			),
		},
		{
			key: "priority",
			title: "Priority",
			render: (item) => (
				<Badge
					variant={
						item.priority === "high"
							? "destructive"
							: item.priority === "medium"
								? "secondary"
								: "outline"
					}
				>
					{item.priority}
				</Badge>
			),
		},
		{
			key: "dueDate",
			title: "Due Date",
			render: (item) => (
				<div className="text-sm">{item.dueDate.toLocaleDateString()}</div>
			),
		},
		{
			key: "tags",
			title: "Tags",
			render: (item) => (
				<div className="flex flex-wrap gap-1">
					{item.tags.slice(0, 2).map((tag) => (
						<Badge key={tag} variant="outline" className="text-xs">
							{tag}
						</Badge>
					))}
					{item.tags.length > 2 && (
						<Badge variant="outline" className="text-xs">
							+{item.tags.length - 2}
						</Badge>
					)}
				</div>
			),
		},
		{
			key: "actions",
			title: "Actions",
			render: (item) => (
				<Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
					Edit
				</Button>
			),
		},
	];

	// Action handlers
	const handleEdit = (item: DemoItem) => {
		toast({
			title: "Edit Item",
			description: `Editing: ${item.name}`,
		});
	};

	const handleBulkDelete = (selectedIds: string[]) => {
		const selectedNames = selectedIds
			.map((id) => data.find((item) => item.id === id)?.name)
			.filter(Boolean);

		if (
			confirm(
				`Delete ${selectedIds.length} items?\n\n${selectedNames.join("\n")}`,
			)
		) {
			setData((prev) => prev.filter((item) => !selectedIds.includes(item.id)));
			toast({
				title: "Items Deleted",
				description: `Successfully deleted ${selectedIds.length} items`,
			});
		}
	};

	const handleBulkExport = (selectedIds: string[]) => {
		const selectedItems = data.filter((item) => selectedIds.includes(item.id));

		// Create CSV content
		const csvContent = [
			"Name,Category,Status,Priority,Assignee,Due Date,Tags",
			...selectedItems.map((item) =>
				[
					`"${item.name}"`,
					item.category,
					item.status,
					item.priority,
					`"${item.assignee}"`,
					item.dueDate.toISOString().split("T")[0],
					`"${item.tags.join(", ")}"`,
				].join(","),
			),
		].join("\n");

		// Download CSV
		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `tasks-${new Date().toISOString().split("T")[0]}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		toast({
			title: "Export Complete",
			description: `Exported ${selectedIds.length} items to CSV`,
		});
	};

	const handleBulkArchive = (selectedIds: string[]) => {
		setData((prev) =>
			prev.map((item) =>
				selectedIds.includes(item.id)
					? { ...item, status: "completed" as const }
					: item,
			),
		);
		toast({
			title: "Items Archived",
			description: `Marked ${selectedIds.length} items as completed`,
		});
	};

	const handleBulkShare = (selectedIds: string[]) => {
		const selectedNames = selectedIds
			.map((id) => data.find((item) => item.id === id)?.name)
			.filter(Boolean);

		toast({
			title: "Share Items",
			description: `Sharing ${selectedIds.length} items: ${selectedNames.slice(0, 2).join(", ")}${selectedNames.length > 2 ? "..." : ""}`,
		});
	};

	const addSampleItem = () => {
		const newItem: DemoItem = {
			id: `${Date.now()}`,
			name: `New Task ${data.length + 1}`,
			category: "work",
			status: "pending",
			priority: "medium",
			assignee: "New User",
			dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
			tags: ["new", "demo"],
		};
		setData((prev) => [...prev, newItem]);
		toast({
			title: "Item Added",
			description: `Added: ${newItem.name}`,
		});
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Bulk Selection Demo</CardTitle>
					<p className="text-muted-foreground">
						Interactive demo showcasing bulk selection features.
						{selectionCount > 0 && (
							<span className="ml-2 font-medium">
								({selectionCount} selected)
							</span>
						)}
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Controls */}
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center space-x-2">
							<Switch
								id="custom-actions"
								checked={showCustomActions}
								onCheckedChange={setShowCustomActions}
							/>
							<Label htmlFor="custom-actions">Show Custom Actions</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Switch
								id="highlight-selected"
								checked={highlightSelected}
								onCheckedChange={setHighlightSelected}
							/>
							<Label htmlFor="highlight-selected">Highlight Selected</Label>
						</div>
						<Button onClick={addSampleItem} size="sm" className="gap-1">
							<Plus className="h-4 w-4" />
							Add Item
						</Button>
					</div>

					{/* Search */}
					<div className="relative max-w-sm">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
						<Input
							placeholder="Search tasks..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>

					{/* Statistics */}
					<div className="flex gap-4 text-muted-foreground text-sm">
						<span>Total: {data.length}</span>
						<span>Visible: {filteredData.length}</span>
						<span>Selected: {selectionCount}</span>
					</div>
				</CardContent>
			</Card>

			{/* Bulk Selection Table */}
			<BulkSelectionTable
				data={filteredData}
				columns={columns}
				getItemId={(item) => item.id}
				getItemLabel={(item) => item.name}
				onDelete={handleBulkDelete}
				onExport={handleBulkExport}
				customActions={
					showCustomActions
						? [
								{
									icon: Archive,
									label: "Archive",
									onClick: handleBulkArchive,
									variant: "outline",
								},
								{
									icon: Share,
									label: "Share",
									onClick: handleBulkShare,
									variant: "secondary",
								},
							]
						: undefined
				}
				emptyMessage="No tasks found. Try adjusting your search."
				rowClassName={
					highlightSelected
						? (_item, isSelected) =>
								isSelected ? "bg-primary/5 border-primary/20" : ""
						: undefined
				}
			/>

			{/* Selection Info */}
			{selectedItems.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-lg">Selection Summary</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm">
								{selectedItems.length} item
								{selectedItems.length !== 1 ? "s" : ""} selected:
							</p>
							<div className="space-y-1">
								{selectedItems.slice(0, 3).map((item) => (
									<div
										key={item.id}
										className="flex items-center gap-2 text-sm"
									>
										<Badge variant="outline" className="text-xs">
											{item.category}
										</Badge>
										<span>{item.name}</span>
									</div>
								))}
								{selectedItems.length > 3 && (
									<p className="text-muted-foreground text-sm">
										...and {selectedItems.length - 3} more
									</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

export function BulkSelectionDemo() {
	return (
		<BulkSelectionProvider>
			<BulkSelectionDemoContent />
		</BulkSelectionProvider>
	);
}
