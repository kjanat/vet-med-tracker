"use client";

import { MoreVertical, Search, Shield, UserPlus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { trpc } from "@/server/trpc/client";

export default function UsersPage() {
	const { selectedHousehold } = useApp();
	const [searchQuery, setSearchQuery] = useState("");
	const [_invitingUser, setInvitingUser] = useState(false);

	// Get household members
	const { data: members, isLoading } = trpc.household.getMembers.useQuery(
		{ householdId: selectedHousehold?.id || "" },
		{ enabled: !!selectedHousehold },
	);

	// Check user's role in household
	const { data: userMembership } = trpc.user.getMembership.useQuery(
		{ householdId: selectedHousehold?.id || "" },
		{ enabled: !!selectedHousehold },
	);

	const canManageUsers = userMembership?.role === "OWNER";

	const filteredMembers = members?.filter(
		(member) =>
			member.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			member.user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	if (!selectedHousehold) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Manage Users</h1>
					<p className="text-muted-foreground">
						Please select a household to manage users
					</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Manage Users</h1>
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
					<h1 className="text-3xl font-bold">Manage Users</h1>
					<p className="text-muted-foreground">
						Members of {selectedHousehold.name}
					</p>
				</div>
				{canManageUsers && (
					<Button onClick={() => setInvitingUser(true)}>
						<UserPlus className="mr-2 h-4 w-4" />
						Invite User
					</Button>
				)}
			</div>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search users..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-9"
				/>
			</div>

			{/* Users List */}
			<div className="grid gap-4">
				{filteredMembers?.map((member) => {
					const initials =
						member.user.name
							?.split(" ")
							.map((n) => n[0])
							.join("")
							.toUpperCase() ||
						member.user.email?.[0]?.toUpperCase() ||
						"?";

					return (
						<Card key={member.id}>
							<CardContent className="p-6">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-4">
										<Avatar className="h-12 w-12">
											<AvatarImage
												src={member.user.image || undefined}
												alt={member.user.name || "User"}
											/>
											<AvatarFallback>{initials}</AvatarFallback>
										</Avatar>
										<div>
											<div className="flex items-center gap-2">
												<h3 className="font-semibold">
													{member.user.name || "Unknown User"}
												</h3>
												<Badge
													variant={
														member.role === "OWNER" ? "default" : "secondary"
													}
													className="flex items-center gap-1"
												>
													<Shield className="h-3 w-3" />
													{member.role}
												</Badge>
											</div>
											<p className="text-sm text-muted-foreground">
												{member.user.email}
											</p>
											<p className="text-xs text-muted-foreground mt-1">
												Joined {new Date(member.createdAt).toLocaleDateString()}
											</p>
										</div>
									</div>
									{canManageUsers && member.role !== "OWNER" && (
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuLabel>Actions</DropdownMenuLabel>
												<DropdownMenuSeparator />
												<DropdownMenuItem>Change Role</DropdownMenuItem>
												<DropdownMenuItem className="text-destructive">
													Remove User
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									)}
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Empty State */}
			{filteredMembers?.length === 0 && (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Search className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="font-semibold text-lg mb-2">No users found</h3>
						<p className="text-muted-foreground text-center">
							{searchQuery
								? "Try adjusting your search"
								: "No members in this household yet"}
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
