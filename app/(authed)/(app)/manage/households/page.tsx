"use client";

import { Building2, Plus, Settings, Users } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/server/trpc/client";

export default function HouseholdsPage() {
	const { user, selectedHousehold, setSelectedHousehold } = useApp();
	const [, setCreatingHousehold] = useState(false);

	// Get user's households
	const { data: memberships, isLoading } = trpc.user.getMemberships.useQuery(
		undefined,
		{
			enabled: !!user,
		},
	);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="font-bold text-3xl">Manage Households</h1>
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl">Manage Households</h1>
					<p className="text-muted-foreground">
						Organizations you belong to or manage
					</p>
				</div>
				<Button onClick={() => setCreatingHousehold(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Household
				</Button>
			</div>

			{/* Household List */}
			<div className="grid gap-4">
				{memberships?.map((membership) => {
					const isSelected = selectedHousehold?.id === membership.household.id;
					const isOwner = membership.role === "OWNER";

					return (
						<Card
							key={membership.household.id}
							className={isSelected ? "border-primary" : ""}
						>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div className="flex items-center gap-3">
										<div className="rounded-full bg-muted p-3">
											<Building2 className="h-5 w-5" />
										</div>
										<div>
											<CardTitle className="text-xl">
												{membership.household.name}
											</CardTitle>
											<CardDescription>
												Created{" "}
												{new Date(
													membership.household.createdAt,
												).toLocaleDateString()}
											</CardDescription>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant={isOwner ? "default" : "secondary"}>
											{membership.role}
										</Badge>
										{isSelected && (
											<Badge variant="outline" className="border-primary">
												Active
											</Badge>
										)}
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-6 text-muted-foreground text-sm">
										<div className="flex items-center gap-1">
											<Users className="h-4 w-4" />
											<span>
												{membership.household._count?.members || 0} members
											</span>
										</div>
										<div className="flex items-center gap-1">
											<span>
												{membership.household._count?.animals || 0} animals
											</span>
										</div>
									</div>
									<div className="flex items-center gap-2">
										{!isSelected && (
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													setSelectedHousehold(membership.household)
												}
											>
												Switch to
											</Button>
										)}
										{isOwner && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => {
													// Navigate to household settings
													window.location.href = `/manage/households/${membership.household.id}`;
												}}
											>
												<Settings className="h-4 w-4" />
											</Button>
										)}
									</div>
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Empty State */}
			{(!memberships || memberships.length === 0) && (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
						<h3 className="mb-2 font-semibold text-lg">No households yet</h3>
						<p className="mb-4 text-center text-muted-foreground">
							Create your first household to start managing medications
						</p>
						<Button onClick={() => setCreatingHousehold(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Create Household
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
