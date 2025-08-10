"use client";

/**
 * Example showing how to retrofit an existing table/list component with bulk selection.
 * This demonstrates the minimal changes needed to add bulk selection to existing components.
 */

import { Download, Trash2 } from "lucide-react";
import { BulkSelectionProvider } from "@/components/providers/bulk-selection-provider";
import { BulkSelectionCheckbox } from "@/components/ui/bulk-selection-checkbox";
import { Button } from "@/components/ui/button";
import { FloatingActionBar } from "@/components/ui/floating-action-bar";
import { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useBulkSelectionIntegration } from "@/hooks/shared/use-bulk-selection-integration";

// Example data interface
interface ExampleItem {
	id: string;
	name: string;
	status: "active" | "inactive";
	createdAt: Date;
}

interface ExistingTableProps {
	data: ExampleItem[];
	onEdit?: (item: ExampleItem) => void;
	onDelete?: (itemIds: string[]) => void;
	onExport?: (itemIds: string[]) => void;
}

// This is how your existing table might look BEFORE adding bulk selection
function ExistingTableOriginal({ data, onEdit }: ExistingTableProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Created</TableHead>
					<TableHead>Actions</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{data.map((item) => (
					<TableRow key={item.id}>
						<TableCell>{item.name}</TableCell>
						<TableCell>{item.status}</TableCell>
						<TableCell>{item.createdAt.toLocaleDateString()}</TableCell>
						<TableCell>
							<Button variant="outline" onClick={() => onEdit?.(item)}>
								Edit
							</Button>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

// This is the RETROFITTED version with bulk selection
function ExistingTableWithBulkSelection({
	data,
	onEdit,
	onDelete,
	onExport,
}: ExistingTableProps) {
	// Use the integration hook to sync data with bulk selection
	const { selectedItems } = useBulkSelectionIntegration({
		data,
		getItemId: (item) => item.id,
		onSelectionChange: (selectedItems, selectedIds) => {
			console.log("Selection changed:", selectedItems, selectedIds);
		},
	});

	const handleBulkDelete = (selectedIds: string[]) => {
		onDelete?.(selectedIds);
	};

	const handleBulkExport = (selectedIds: string[]) => {
		onExport?.(selectedIds);
	};

	return (
		<div>
			<Table>
				<TableHeader>
					<TableRow>
						{/* NEW: Added selection column */}
						<TableHead className="w-[50px]">
							<SelectAllCheckbox />
						</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Created</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.map((item) => (
						<TableRow key={item.id}>
							{/* NEW: Added selection checkbox */}
							<TableCell>
								<BulkSelectionCheckbox
									id={item.id}
									aria-label={`Select ${item.name}`}
								/>
							</TableCell>
							<TableCell>{item.name}</TableCell>
							<TableCell>{item.status}</TableCell>
							<TableCell>{item.createdAt.toLocaleDateString()}</TableCell>
							<TableCell>
								<Button variant="outline" onClick={() => onEdit?.(item)}>
									Edit
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{/* NEW: Added floating action bar */}
			<FloatingActionBar
				onDelete={handleBulkDelete}
				onExport={handleBulkExport}
				customActions={[
					{
						icon: ({ className }) => <Download className={className} />,
						label: "Archive",
						onClick: (selectedIds) => console.log("Archive:", selectedIds),
						variant: "outline",
					},
				]}
			/>
		</div>
	);
}

// FINAL: The public component wrapped with BulkSelectionProvider
export function RetrofittedTableExample(props: ExistingTableProps) {
	return (
		<BulkSelectionProvider>
			<ExistingTableWithBulkSelection {...props} />
		</BulkSelectionProvider>
	);
}

// Usage example:
export function ExampleUsage() {
	const sampleData: ExampleItem[] = [
		{
			id: "1",
			name: "Item 1",
			status: "active",
			createdAt: new Date(),
		},
		{
			id: "2",
			name: "Item 2",
			status: "inactive",
			createdAt: new Date(),
		},
	];

	return (
		<RetrofittedTableExample
			data={sampleData}
			onEdit={(item) => console.log("Edit:", item)}
			onDelete={(ids) => console.log("Delete:", ids)}
			onExport={(ids) => console.log("Export:", ids)}
		/>
	);
}

/**
 * Summary of changes needed to retrofit existing table/list:
 *
 * 1. Wrap component with BulkSelectionProvider
 * 2. Add selection column header with SelectAllCheckbox
 * 3. Add selection cell with BulkSelectionCheckbox for each row
 * 4. Add FloatingActionBar component
 * 5. Use useBulkSelectionIntegration hook to sync data
 * 6. Handle bulk actions (delete, export, etc.)
 *
 * Total lines added: ~20-30 lines
 * Breaking changes: None (all additive)
 */
