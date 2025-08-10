"use client";

import React from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import {
	BulkSelectionProvider,
	useBulkSelection,
} from "@/components/providers/bulk-selection-provider";
import { Badge } from "@/components/ui/badge";
import { BulkSelectionCheckbox } from "@/components/ui/bulk-selection-checkbox";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { trpc } from "@/server/trpc/client";
import { BulkAdminActions } from "./bulk-admin-actions";

function AnimalTable() {
	const { selectedHouseholdId } = useApp();
	const { setAvailableIds } = useBulkSelection();

	// Fetch animals
	const { data: animals = [], isLoading } = trpc.animal.list.useQuery(
		{
			householdId: selectedHouseholdId || "",
		},
		{
			enabled: !!selectedHouseholdId,
		},
	);

	// Set available IDs for bulk selection when animals data changes
	React.useEffect(() => {
		if (animals.length > 0) {
			setAvailableIds(animals.map((animal) => animal.id));
		}
	}, [animals, setAvailableIds]);

	if (isLoading) {
		return <div>Loading animals...</div>;
	}

	if (animals.length === 0) {
		return (
			<Card>
				<CardContent className="pt-6">
					<div className="text-center text-muted-foreground">
						No animals found. Add some animals first to use bulk recording.
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<SelectAllCheckbox />
					Animals Available for Bulk Recording
				</CardTitle>
				<CardDescription>
					Select multiple animals to record administrations for them all at
					once.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">Select</TableHead>
							<TableHead>Name</TableHead>
							<TableHead>Species</TableHead>
							<TableHead>Breed</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{animals.map((animal) => (
							<TableRow key={animal.id}>
								<TableCell>
									<BulkSelectionCheckbox id={animal.id} />
								</TableCell>
								<TableCell className="font-medium">{animal.name}</TableCell>
								<TableCell>
									<Badge variant="outline">{animal.species}</Badge>
								</TableCell>
								<TableCell>{animal.breed || "Mixed"}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

export function BulkRecordingDemo() {
	return (
		<BulkSelectionProvider>
			<div className="container mx-auto max-w-6xl space-y-6 py-6">
				<div className="space-y-2">
					<h1 className="font-bold text-3xl">Bulk Administration Recording</h1>
					<p className="text-muted-foreground">
						Select multiple animals and record medication administrations for
						them all at once.
					</p>
				</div>

				<AnimalTable />

				{/* Instructions */}
				<Card>
					<CardHeader>
						<CardTitle>How to Use Bulk Recording</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex items-start gap-3">
							<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
								1
							</div>
							<div>
								<h4 className="font-medium">Select Animals</h4>
								<p className="text-muted-foreground text-sm">
									Check the boxes next to the animals you want to record
									administrations for. Use "Select All" to select all animals at
									once.
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
								2
							</div>
							<div>
								<h4 className="font-medium">Access Bulk Actions</h4>
								<p className="text-muted-foreground text-sm">
									Once you select animals, a floating action bar will appear at
									the bottom with bulk action options.
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-medium text-primary-foreground text-sm">
								3
							</div>
							<div>
								<h4 className="font-medium">Record Administrations</h4>
								<p className="text-muted-foreground text-sm">
									Click "Record Administration" to open the bulk recording form.
									Fill in the common details and submit to record for all
									selected animals.
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<BulkAdminActions />
			</div>
		</BulkSelectionProvider>
	);
}
