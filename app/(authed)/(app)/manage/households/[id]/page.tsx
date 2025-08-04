"use client";

import {
	AlertCircle,
	ArrowLeft,
	Building2,
	Settings,
	Users,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/server/trpc/client";

export default function HouseholdDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const householdId = params.id as string;
	const { user } = useApp();

	// Fetch household data
	const {
		data: household,
		isLoading,
		error,
	} = trpc.household.get.useQuery(
		{ householdId },
		{
			enabled: !!householdId,
		},
	);

	// Get user's membership to check role
	const { data: memberships } = trpc.user.getMemberships.useQuery(undefined, {
		enabled: !!user,
	});

	const membership = memberships?.find((m) => m.household.id === householdId);
	const isOwner = membership?.role === "OWNER";

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Skeleton className="h-10 w-10" />
					<div className="space-y-2">
						<Skeleton className="h-8 w-48" />
						<Skeleton className="h-4 w-64" />
					</div>
				</div>
				<Skeleton className="h-96 w-full" />
			</div>
		);
	}

	if (error || !household) {
		return (
			<div className="space-y-6">
				<Button
					variant="ghost"
					onClick={() => router.push("/manage/households")}
					className="gap-2"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Households
				</Button>

				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						{error?.message ||
							"Household not found or you don't have access to it."}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => router.push("/manage/households")}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<p className="text-muted-foreground">
						View {household.name} information
					</p>
				</div>
			</div>

			{/* Household Info */}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								{household.name}
							</CardTitle>
							<CardDescription>
								Household information and settings
							</CardDescription>
						</div>
						<Badge variant={isOwner ? "default" : "secondary"}>
							{membership?.role || "Unknown"}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<p className="text-muted-foreground text-sm">Timezone</p>
							<p className="font-medium">{household.timezone || "Not set"}</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Created</p>
							<p className="font-medium">
								{new Date(household.createdAt).toLocaleDateString()}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Household Stats */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						Household Statistics
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Users className="h-4 w-4" />
							<span>Members</span>
						</div>
						<span className="font-medium">
							{household.memberships?.length || 0}
						</span>
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<div className="text-muted-foreground">Animals</div>
						<span className="font-medium">
							{household.animals?.length || 0}
						</span>
					</div>
				</CardContent>
			</Card>

			{/* Members List */}
			{household.memberships && household.memberships.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							Members
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{household.memberships.map((member) => (
								<div
									key={member.id}
									className="flex items-center justify-between rounded-lg border p-3"
								>
									<div>
										<p className="font-medium">
											{member.userId === user?.id
												? "You"
												: `User ${member.userId.slice(0, 8)}...`}
										</p>
										<p className="text-muted-foreground text-sm">
											Joined {new Date(member.createdAt).toLocaleDateString()}
										</p>
									</div>
									<Badge
										variant={member.role === "OWNER" ? "default" : "secondary"}
									>
										{member.role}
									</Badge>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Note about editing */}
			{isOwner && (
				<Alert>
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Household editing features are coming soon. For now, you can view
						household details and manage members through the main households
						page.
					</AlertDescription>
				</Alert>
			)}

			{/* Actions */}
			<div className="flex justify-end">
				<Button
					variant="outline"
					onClick={() => router.push("/manage/households")}
				>
					Back to Households
				</Button>
			</div>
		</div>
	);
}
