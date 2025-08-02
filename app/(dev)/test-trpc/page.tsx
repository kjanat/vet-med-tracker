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

interface AuthTestResult {
	isError: boolean;
	error?: { message: string } | null;
	data?: unknown;
}

interface HouseholdListItem {
	id: string;
	name: string;
	timezone: string;
	role: "OWNER" | "CAREGIVER" | "VETREADONLY";
}

interface HouseholdDetailsData {
	animals?: Array<{ id: string; name: string; species: string }>;
	memberships?: Array<{
		id: string;
		role: string;
		user?: { name?: string | null; email?: string | null };
	}>;
}

// Extract connection status component
function ConnectionStatus({ authTest }: { authTest: AuthTestResult }) {
	const getStatusContent = () => {
		if (authTest.isError) {
			return (
				<span className="text-red-600">
					❌ Auth Error: {authTest.error?.message}
				</span>
			);
		}
		if (authTest.data !== undefined) {
			return (
				<span className="text-green-600">
					✅ Mock auth working, database connected
				</span>
			);
		}
		return <span>🔄 Testing connection...</span>;
	};

	return (
		<Alert className={authTest.isError ? "border-red-500" : "border-green-500"}>
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Auth & Database Status</AlertTitle>
			<AlertDescription>{getStatusContent()}</AlertDescription>
		</Alert>
	);
}

// Extract household list component
function HouseholdsList({
	households,
	isLoading,
	error,
	selectedId,
	onSelect,
}: {
	households: HouseholdListItem[] | undefined;
	isLoading: boolean;
	error: { message: string } | null;
	selectedId: string | null;
	onSelect: (id: string) => void;
}) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Your Households</CardTitle>
					<CardDescription>Click on a household to see details</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Your Households</CardTitle>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertDescription>
							Error loading households: {error.message}
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Your Households</CardTitle>
				<CardDescription>Click on a household to see details</CardDescription>
			</CardHeader>
			<CardContent>
				{households && households.length > 0 ? (
					<div className="space-y-2">
						{households.map((household) => (
							<HouseholdItem
								key={household.id}
								household={household}
								isSelected={selectedId === household.id}
								onClick={() => onSelect(household.id)}
							/>
						))}
					</div>
				) : (
					<p className="text-muted-foreground">
						No households found. Create one above or run the seed script!
					</p>
				)}
			</CardContent>
		</Card>
	);
}

// Extract household item
function HouseholdItem({
	household,
	isSelected,
	onClick,
}: {
	household: HouseholdListItem;
	isSelected: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className={`p-4 border rounded-lg cursor-pointer transition-colors w-full text-left ${
				isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
			}`}
			onClick={onClick}
		>
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold">{household.name}</h3>
					<p className="text-sm text-muted-foreground">{household.timezone}</p>
				</div>
				<Badge variant={household.role === "OWNER" ? "default" : "secondary"}>
					{household.role}
				</Badge>
			</div>
		</button>
	);
}

// Extract household details component
function HouseholdDetails({
	details,
	isLoading,
}: {
	details: HouseholdDetailsData | undefined;
	isLoading: boolean;
}) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Household Details</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-32 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (!details) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Household Details</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">Failed to load details</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Household Details</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					<DetailSection
						title={`Animals (${details.animals?.length || 0})`}
						items={details.animals}
						renderItem={(animal) => `${animal.name} (${animal.species})`}
						emptyMessage="No animals yet"
					/>
					<DetailSection
						title={`Members (${details.memberships?.length || 0})`}
						items={details.memberships}
						renderItem={(membership) =>
							`${membership.user?.name || membership.user?.email} - ${membership.role}`
						}
						emptyMessage="No members"
					/>
				</div>
			</CardContent>
		</Card>
	);
}

// Helper component for detail sections
function DetailSection<T extends { id?: string }>({
	title,
	items,
	renderItem,
	emptyMessage,
}: {
	title: string;
	items: T[] | undefined;
	renderItem: (item: T) => string;
	emptyMessage: string;
}) {
	return (
		<div>
			<h4 className="font-semibold mb-2">{title}</h4>
			{items && items.length > 0 ? (
				<ul className="space-y-1">
					{items.map((item, index) => (
						<li key={item.id || index} className="text-sm">
							• {renderItem(item)}
						</li>
					))}
				</ul>
			) : (
				<p className="text-sm text-muted-foreground">{emptyMessage}</p>
			)}
		</div>
	);
}

// Extract household form component
function CreateHouseholdForm({ onSuccess }: { onSuccess: () => void }) {
	const [newHouseholdName, setNewHouseholdName] = useState("");

	const createHouseholdMutation = trpc.household.create.useMutation({
		onSuccess: () => {
			onSuccess();
			setNewHouseholdName("");
		},
		onError: (error) => {
			console.error("Error creating household:", error);
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newHouseholdName) return;

		await createHouseholdMutation.mutate({
			name: newHouseholdName,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		});
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create New Household</CardTitle>
				<CardDescription>
					This will create a new household in the database
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="household-name">Household Name</Label>
						<Input
							id="household-name"
							value={newHouseholdName}
							onChange={(e) => setNewHouseholdName(e.target.value)}
							placeholder="Enter household name"
							disabled={createHouseholdMutation.isPending}
						/>
					</div>
					<Button
						type="submit"
						disabled={!newHouseholdName || createHouseholdMutation.isPending}
						className="w-full"
					>
						{createHouseholdMutation.isPending
							? "Creating..."
							: "Create Household"}
					</Button>
					{createHouseholdMutation.error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								{createHouseholdMutation.error.message}
							</AlertDescription>
						</Alert>
					)}
				</form>
			</CardContent>
		</Card>
	);
}

export default function TestTRPCPage() {
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
			{ householdId: selectedHouseholdId || "" },
			{ enabled: !!selectedHouseholdId },
		);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Test tRPC + Database Connection</h1>
				<p className="text-muted-foreground">
					Testing Drizzle ORM with Neon PostgreSQL through tRPC
				</p>
			</div>

			{/* Connection Status */}
			<ConnectionStatus authTest={authTest} />

			{/* Create Household Form */}
			<CreateHouseholdForm onSuccess={refetchHouseholds} />

			{/* Households List */}
			<HouseholdsList
				households={households}
				isLoading={householdsLoading}
				error={householdsError}
				selectedId={selectedHouseholdId}
				onSelect={setSelectedHouseholdId}
			/>

			{/* Household Details */}
			{selectedHouseholdId && (
				<HouseholdDetails
					details={householdDetails}
					isLoading={detailsLoading}
				/>
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
