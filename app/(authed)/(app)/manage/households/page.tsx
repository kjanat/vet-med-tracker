"use client";

import {
	Building2,
	Edit2,
	Globe,
	LogOut,
	MoreVertical,
	Plus,
	Settings,
	Users,
} from "lucide-react";
import { useState } from "react";
import { type Member, MemberList } from "@/components/household/member-list";
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/server/trpc/client";

export default function HouseholdsPage() {
	const { user, selectedHousehold, setSelectedHousehold } = useApp();
	const { toast } = useToast();
	const [, setCreatingHousehold] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
	const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(
		null,
	);
	const [leavingHouseholdId, setLeavingHouseholdId] = useState<string | null>(
		null,
	);
	const [editedName, setEditedName] = useState("");
	const [editedTimezone, setEditedTimezone] = useState("");

	// Get user's households
	const {
		data: memberships,
		isLoading,
		refetch,
	} = trpc.user.getMemberships.useQuery(undefined, {
		enabled: !!user,
	});

	// Get detailed data for selected household
	const { data: selectedHouseholdData } = trpc.household.get.useQuery(
		{ householdId: selectedHousehold?.id ?? "" },
		{ enabled: !!selectedHousehold?.id },
	);

	// Get members for selected household
	const { data: membersData } = trpc.household.getMembers.useQuery(
		{ householdId: selectedHousehold?.id ?? "" },
		{ enabled: !!selectedHousehold?.id },
	);

	// Transform members data
	const members: Member[] =
		membersData?.map((member) => ({
			id: member.id,
			userId: member.userId,
			email: member.user.email,
			name: member.user.name || undefined,
			avatar: member.user.image || undefined,
			role: member.role,
			joinedAt: new Date(member.createdAt),
			lastActiveAt: member.updatedAt ? new Date(member.updatedAt) : undefined,
		})) ?? [];

	// Find current user's role in selected household
	const currentUserMembership = membersData?.find(
		(member) => member.userId === user?.id,
	);
	const userRoleInSelected = currentUserMembership?.role;

	// Mutations
	const updateHouseholdMutation = trpc.household.update.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Household updated",
				description: "Your household settings have been saved.",
			});
			// Update the selected household in context if it was updated
			if (selectedHousehold && data.id === selectedHousehold.id) {
				setSelectedHousehold({ ...selectedHousehold, name: data.name });
			}
			setIsEditDialogOpen(false);
			setEditingHouseholdId(null);
			refetch();
		},
		onError: (error) => {
			toast({
				title: "Failed to update household",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const leaveHouseholdMutation = trpc.household.leave.useMutation({
		onSuccess: () => {
			toast({
				title: "Left household",
				description: "You have successfully left the household.",
			});
			// Clear selected if leaving current household
			if (leavingHouseholdId === selectedHousehold?.id) {
				setSelectedHousehold(null);
			}
			setIsLeaveDialogOpen(false);
			setLeavingHouseholdId(null);
			refetch();
		},
		onError: (error) => {
			toast({
				title: "Failed to leave household",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleEditHousehold = (householdId: string) => {
		const membership = memberships?.find((m) => m.household.id === householdId);
		if (!membership) return;

		setEditingHouseholdId(householdId);
		setEditedName(membership.household.name);
		setEditedTimezone(membership.household.timezone || "America/New_York");
		setIsEditDialogOpen(true);
	};

	const handleSaveHousehold = () => {
		if (!editingHouseholdId) return;
		updateHouseholdMutation.mutate({
			householdId: editingHouseholdId,
			name: editedName,
			timezone: editedTimezone,
		});
	};

	const handleLeaveHousehold = () => {
		if (!leavingHouseholdId) return;
		leaveHouseholdMutation.mutate({
			householdId: leavingHouseholdId,
		});
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground">
					Manage your households and their members
				</p>
				<Button onClick={() => setCreatingHousehold(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Create Household
				</Button>
			</div>

			{/* Main Content with Tabs */}
			<Tabs defaultValue="all" className="space-y-6">
				<TabsList>
					<TabsTrigger value="all">All Households</TabsTrigger>
					{selectedHousehold && (
						<TabsTrigger value="current">Current Household</TabsTrigger>
					)}
				</TabsList>

				{/* All Households Tab */}
				<TabsContent value="all" className="space-y-4">
					<div className="grid gap-4">
						{memberships?.map((membership) => {
							const isSelected =
								selectedHousehold?.id === membership.household.id;
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
														{membership.household.timezone && (
															<span className="ml-2">
																• {membership.household.timezone}
															</span>
														)}
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
														Make Active
													</Button>
												)}
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="icon">
															<MoreVertical className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														{isOwner && (
															<>
																<DropdownMenuItem
																	onClick={() =>
																		handleEditHousehold(membership.household.id)
																	}
																>
																	<Edit2 className="mr-2 h-4 w-4" />
																	Edit Settings
																</DropdownMenuItem>
																<DropdownMenuSeparator />
															</>
														)}
														{!isOwner && (
															<DropdownMenuItem
																onClick={() => {
																	setLeavingHouseholdId(
																		membership.household.id,
																	);
																	setIsLeaveDialogOpen(true);
																}}
																className="text-destructive"
															>
																<LogOut className="mr-2 h-4 w-4" />
																Leave Household
															</DropdownMenuItem>
														)}
													</DropdownMenuContent>
												</DropdownMenu>
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
								<h3 className="mb-2 font-semibold text-lg">
									No households yet
								</h3>
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
				</TabsContent>

				{/* Current Household Tab */}
				{selectedHousehold && (
					<TabsContent value="current" className="space-y-6">
						{/* Household Details Card */}
						<Card>
							<CardHeader>
								<div className="flex items-start justify-between">
									<div>
										<CardTitle className="flex items-center gap-2">
											<Building2 className="h-5 w-5" />
											{selectedHousehold.name}
										</CardTitle>
										<CardDescription>
											Household information and settings
										</CardDescription>
									</div>
									{userRoleInSelected && (
										<Badge
											variant={
												userRoleInSelected === "OWNER" ? "default" : "secondary"
											}
										>
											{userRoleInSelected}
										</Badge>
									)}
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								{selectedHouseholdData && (
									<>
										<div className="grid gap-4 sm:grid-cols-2">
											<div>
												<p className="text-muted-foreground text-sm">
													Timezone
												</p>
												<p className="font-medium">
													{selectedHouseholdData.timezone || "Not set"}
												</p>
											</div>
											<div>
												<p className="text-muted-foreground text-sm">Created</p>
												<p className="font-medium">
													{new Date(
														selectedHouseholdData.createdAt,
													).toLocaleDateString()}
												</p>
											</div>
										</div>
										<Separator />
										<div className="flex flex-wrap gap-2">
											{userRoleInSelected === "OWNER" && (
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														handleEditHousehold(selectedHousehold.id)
													}
												>
													<Edit2 className="mr-2 h-4 w-4" />
													Edit Settings
												</Button>
											)}
											{userRoleInSelected !== "OWNER" && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setLeavingHouseholdId(selectedHousehold.id);
														setIsLeaveDialogOpen(true);
													}}
												>
													<LogOut className="mr-2 h-4 w-4" />
													Leave Household
												</Button>
											)}
										</div>
									</>
								)}
							</CardContent>
						</Card>

						{/* Household Statistics */}
						{selectedHouseholdData && (
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Settings className="h-5 w-5" />
										Household Statistics
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="grid gap-4 sm:grid-cols-3">
										<div>
											<p className="text-muted-foreground text-sm">Members</p>
											<p className="font-medium text-2xl">
												{selectedHouseholdData.memberships?.length || 0}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground text-sm">Animals</p>
											<p className="font-medium text-2xl">
												{selectedHouseholdData.animals?.length || 0}
											</p>
										</div>
										<div>
											<p className="text-muted-foreground text-sm">
												Active Regimens
											</p>
											<p className="font-medium text-2xl">
												{selectedHouseholdData.regimens?.filter(
													(r) => r.isActive,
												).length || 0}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						)}

						{/* Members List */}
						<MemberList members={members} userRole={userRoleInSelected} />
					</TabsContent>
				)}
			</Tabs>

			{/* Edit Household Dialog */}
			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Household Settings</DialogTitle>
						<DialogDescription>
							Update your household name and timezone settings.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="household-name">Household Name</Label>
							<Input
								id="household-name"
								value={editedName}
								onChange={(e) => setEditedName(e.target.value)}
								placeholder="Enter household name"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="household-timezone">Timezone</Label>
							<Select value={editedTimezone} onValueChange={setEditedTimezone}>
								<SelectTrigger id="household-timezone">
									<SelectValue placeholder="Select timezone" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="America/New_York">
										<div className="flex items-center gap-2">
											<Globe className="h-4 w-4" />
											Eastern Time (New York)
										</div>
									</SelectItem>
									<SelectItem value="America/Chicago">
										<div className="flex items-center gap-2">
											<Globe className="h-4 w-4" />
											Central Time (Chicago)
										</div>
									</SelectItem>
									<SelectItem value="America/Denver">
										<div className="flex items-center gap-2">
											<Globe className="h-4 w-4" />
											Mountain Time (Denver)
										</div>
									</SelectItem>
									<SelectItem value="America/Los_Angeles">
										<div className="flex items-center gap-2">
											<Globe className="h-4 w-4" />
											Pacific Time (Los Angeles)
										</div>
									</SelectItem>
									<SelectItem value="Europe/London">
										<div className="flex items-center gap-2">
											<Globe className="h-4 w-4" />
											GMT (London)
										</div>
									</SelectItem>
									<SelectItem value="Europe/Paris">
										<div className="flex items-center gap-2">
											<Globe className="h-4 w-4" />
											CET (Paris)
										</div>
									</SelectItem>
									<SelectItem value="Asia/Tokyo">
										<div className="flex items-center gap-2">
											<Globe className="h-4 w-4" />
											JST (Tokyo)
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsEditDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSaveHousehold}
							disabled={updateHouseholdMutation.isPending}
						>
							Save Changes
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Leave Household Dialog */}
			<Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Leave Household</DialogTitle>
						<DialogDescription>
							Are you sure you want to leave this household? You'll need to be
							invited back to regain access.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsLeaveDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleLeaveHousehold}
							disabled={leaveHouseholdMutation.isPending}
						>
							Leave Household
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
