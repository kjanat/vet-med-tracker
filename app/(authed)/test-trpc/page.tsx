"use client";

import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/server/trpc/client";

export default function TestTRPCPage() {
	const [newHouseholdName, setNewHouseholdName] = useState("");
	const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(
		null,
	);

	// Test auth status
	const authTest = trpc.household.list.useQuery(undefined, {
		retry: false,
	});

	// Fetch households
	const {
		data: households,
		isLoading: householdsLoading,
		error: householdsError,
		refetch: refetchHouseholds,
	} = trpc.household.list.useQuery();

	// Get selected household details
	const { data: householdDetails, isLoading: detailsLoading } =
		trpc.household.get.useQuery(
			{ householdId: selectedHouseholdId! },
			{ enabled: !!selectedHouseholdId },
		);

	// Create household mutation
	const createHouseholdMutation = trpc.household.create.useMutation({
		onSuccess: () => {
			refetchHouseholds();
			setNewHouseholdName("");
		},
		onError: (error) => {
			console.error("Error creating household:", error);
		},
	});

	const handleCreateHousehold = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newHouseholdName) return;

		await createHouseholdMutation.mutate({
			name: newHouseholdName,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Test tRPC + Database Connection</h1>
				<p className="text-muted-foreground">
					Testing Drizzle ORM with Neon PostgreSQL through tRPC
				</p>
			</div>

			{/* Connection Status */}
			<Alert
				className={authTest.isError ? "border-red-500" : "border-green-500"}
			>
				<AlertCircle className="h-4 w-4" />
				<AlertTitle>Auth & Database Status</AlertTitle>
				<AlertDescription>
					{authTest.isError ? (
						<span className="text-red-600">
							❌ Auth Error: {authTest.error?.message}
						</span>
					) : authTest.data !== undefined ? (
						<span className="text-green-600">
							✅ Mock auth working, database connected
						</span>
					) : (
						<span>🔄 Testing connection...</span>
					)}
				</AlertDescription>
			</Alert>

			{/* Create Household Form */}
			<Card>
				<CardHeader>
					<CardTitle>Create New Household</CardTitle>
					<CardDescription>Test the create mutation</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleCreateHousehold} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="householdName">Household Name</Label>
							<Input
								id="householdName"
								value={newHouseholdName}
								onChange={(e) => setNewHouseholdName(e.target.value)}
								placeholder="e.g., Smith Family"
								required
							/>
						</div>
						<Button
							type="submit"
							disabled={createHouseholdMutation.isPending || authTest.isError}
						>
							{createHouseholdMutation.isPending
								? "Creating..."
								: "Create Household"}
						</Button>
						{createHouseholdMutation.error && (
							<Alert variant="destructive">
								<AlertDescription>
									Error: {createHouseholdMutation.error.message}
								</AlertDescription>
							</Alert>
						)}
					</form>
				</CardContent>
			</Card>

			{/* Households List */}
			<Card>
				<CardHeader>
					<CardTitle>Your Households</CardTitle>
					<CardDescription>Click on a household to see details</CardDescription>
				</CardHeader>
				<CardContent>
					{householdsLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-12 w-full" />
							<Skeleton className="h-12 w-full" />
						</div>
					) : householdsError ? (
						<Alert variant="destructive">
							<AlertDescription>
								Error loading households: {householdsError.message}
							</AlertDescription>
						</Alert>
					) : households && households.length > 0 ? (
						<div className="space-y-2">
							{households.map((household) => (
								<button
									type="button"
									key={household.id}
									className={`p-4 border rounded-lg cursor-pointer transition-colors w-full text-left ${
										selectedHouseholdId === household.id
											? "border-primary bg-primary/5"
											: "hover:bg-muted/50"
									}`}
									onClick={() => setSelectedHouseholdId(household.id)}
								>
									<div className="flex items-center justify-between">
										<div>
											<h3 className="font-semibold">{household.name}</h3>
											<p className="text-sm text-muted-foreground">
												{household.timezone}
											</p>
										</div>
										<Badge
											variant={
												household.role === "OWNER" ? "default" : "secondary"
											}
										>
											{household.role}
										</Badge>
									</div>
								</button>
							))}
						</div>
					) : (
						<p className="text-muted-foreground">
							No households found. Create one above or run the seed script!
						</p>
					)}
				</CardContent>
			</Card>

			{/* Household Details */}
			{selectedHouseholdId && (
				<Card>
					<CardHeader>
						<CardTitle>Household Details</CardTitle>
					</CardHeader>
					<CardContent>
						{detailsLoading ? (
							<Skeleton className="h-32 w-full" />
						) : householdDetails ? (
							<div className="space-y-4">
								<div>
									<h4 className="font-semibold mb-2">
										Animals ({householdDetails.animals?.length || 0})
									</h4>
									{householdDetails.animals &&
									householdDetails.animals.length > 0 ? (
										<ul className="space-y-1">
											{householdDetails.animals.map((animal) => (
												<li key={animal.id} className="text-sm">
													• {animal.name} ({animal.species})
												</li>
											))}
										</ul>
									) : (
										<p className="text-sm text-muted-foreground">
											No animals yet
										</p>
									)}
								</div>
								<div>
									<h4 className="font-semibold mb-2">
										Members ({householdDetails.memberships?.length || 0})
									</h4>
									{householdDetails.memberships &&
									householdDetails.memberships.length > 0 ? (
										<ul className="space-y-1">
											{householdDetails.memberships.map((membership) => (
												<li key={membership.id} className="text-sm">
													• {membership.user?.name || membership.user?.email} -{" "}
													{membership.role}
												</li>
											))}
										</ul>
									) : (
										<p className="text-sm text-muted-foreground">No members</p>
									)}
								</div>
							</div>
						) : (
							<p className="text-muted-foreground">Failed to load details</p>
						)}
					</CardContent>
				</Card>
			)}

			{/* Instructions */}
			<Card>
				<CardHeader>
					<CardTitle>Setup Instructions</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					<p>
						1. Run migrations:{" "}
						<code className="bg-muted px-2 py-1 rounded">pnpm db:push</code>
					</p>
					<p>
						2. Seed the database:{" "}
						<code className="bg-muted px-2 py-1 rounded">pnpm db:seed</code>
					</p>
					<p>3. Refresh this page to see the seeded data</p>
					<p className="mt-4 text-muted-foreground">
						The mock auth provider will create a dev session automatically.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
