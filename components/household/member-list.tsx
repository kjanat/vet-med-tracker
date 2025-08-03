"use client";

import { useUser } from "@clerk/nextjs";
import {
	Crown,
	Eye,
	Mail,
	MoreHorizontal,
	Plus,
	Shield,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getAvatarColor } from "@/lib/avatar-utils";
import { cn } from "@/lib/utils";
import { trpc } from "@/server/trpc/client";
import { InviteForm } from "./invite-form";

export interface Member {
	id: string;
	userId: string;
	email: string;
	name?: string;
	avatar?: string;
	role: "OWNER" | "CAREGIVER" | "VETREADONLY";
	joinedAt: Date;
	lastActiveAt?: Date;
}

export interface PendingInvite {
	id: string;
	email: string;
	role: "OWNER" | "CAREGIVER" | "VETREADONLY";
	invitedBy: string;
	invitedAt: Date;
	expiresAt: Date;
}

const roleIcons = {
	OWNER: Crown,
	CAREGIVER: Shield,
	VETREADONLY: Eye,
};

const roleColors = {
	OWNER: "bg-yellow-100 text-yellow-800 border-yellow-200",
	CAREGIVER: "bg-blue-100 text-blue-800 border-blue-200",
	VETREADONLY: "bg-gray-100 text-gray-800 border-gray-200",
};

export function MemberList() {
	const [inviteFormOpen, setInviteFormOpen] = useState(false);
	const { selectedHousehold } = useApp();
	const { user: clerkUser } = useUser();
	const { toast } = useToast();
	const isMobile = useMediaQuery("(max-width: 768px)");
	const utils = trpc.useUtils();

	// Get household members
	const { data: membersData = [], isLoading: membersLoading } =
		trpc.household.getMembers.useQuery(
			{ householdId: selectedHousehold?.id ?? "" },
			{ enabled: !!selectedHousehold?.id },
		);

	// Transform data to match UI expectations
	const members = membersData.map((member) => ({
		id: member.id,
		userId: member.userId,
		email: member.user.email,
		name: member.user.name,
		avatar: member.user.image,
		role: member.role,
		joinedAt: new Date(member.createdAt),
		lastActiveAt: new Date(member.updatedAt),
	}));

	// For now, use empty array for pending invites since we don't have a full invitation system
	const pendingInvites: PendingInvite[] = [];

	// Check if current user can manage roles (must be OWNER)
	const currentUserMembership = membersData.find(
		(m) => m.user.email === clerkUser?.emailAddresses[0]?.emailAddress,
	);
	const canManageRoles = currentUserMembership?.role === "OWNER";

	// Mutations
	const inviteMemberMutation = trpc.household.inviteMember.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Success",
				description: data.message,
				variant: "default",
			});
			utils.household.getMembers.invalidate();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const updateRoleMutation = trpc.household.updateMemberRole.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Success",
				description: data.message,
				variant: "default",
			});
			utils.household.getMembers.invalidate();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const removeMemberMutation = trpc.household.removeMember.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Success",
				description: data.message,
				variant: "default",
			});
			utils.household.getMembers.invalidate();
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const resendInviteMutation = trpc.household.resendInvite.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Success",
				description: data.message,
				variant: "default",
			});
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const revokeInviteMutation = trpc.household.revokeInvite.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Success",
				description: data.message,
				variant: "default",
			});
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	if (membersLoading) {
		return <div>Loading members...</div>;
	}

	if (!selectedHousehold) {
		return <div>Please select a household</div>;
	}

	const handleInvite = async (
		email: string,
		role: "OWNER" | "CAREGIVER" | "VETREADONLY",
	) => {
		if (!selectedHousehold?.id) return;

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent("settings_household_invite", {
				detail: { email, role },
			}),
		);

		try {
			await inviteMemberMutation.mutateAsync({
				householdId: selectedHousehold.id,
				email,
				role,
			});
			setInviteFormOpen(false);
		} catch (error) {
			// Error handled by mutation onError
			console.error("Failed to invite member:", error);
		}
	};

	const handleRoleChange = async (
		memberId: string,
		newRole: "OWNER" | "CAREGIVER" | "VETREADONLY",
	) => {
		if (!canManageRoles || !selectedHousehold?.id) return;

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent("settings_household_role_change", {
				detail: { memberId, newRole },
			}),
		);

		try {
			await updateRoleMutation.mutateAsync({
				householdId: selectedHousehold.id,
				membershipId: memberId,
				newRole,
			});
		} catch (error) {
			// Error handled by mutation onError
			console.error("Failed to update role:", error);
		}
	};

	const handleRevokeInvite = async (inviteId: string) => {
		if (!selectedHousehold?.id) return;

		try {
			await revokeInviteMutation.mutateAsync({
				householdId: selectedHousehold.id,
				inviteId,
			});
		} catch (error) {
			// Error handled by mutation onError
			console.error("Failed to revoke invite:", error);
		}
	};

	const handleResendInvite = async (inviteId: string) => {
		if (!selectedHousehold?.id) return;

		try {
			await resendInviteMutation.mutateAsync({
				householdId: selectedHousehold.id,
				inviteId,
			});
		} catch (error) {
			// Error handled by mutation onError
			console.error("Failed to resend invite:", error);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-bold text-2xl">Household & Roles</h2>
					<p className="text-muted-foreground">
						Manage household members and their permissions
					</p>
				</div>
				{canManageRoles && (
					<Button
						onClick={() => setInviteFormOpen(true)}
						className="gap-2"
						disabled={inviteMemberMutation.isPending}
					>
						<Plus className="h-4 w-4" />
						Invite Member
					</Button>
				)}
			</div>

			{/* Permission Matrix Info */}
			<Card>
				<CardHeader>
					<CardTitle className="text-lg">Role Permissions</CardTitle>
				</CardHeader>
				<CardContent>
					{isMobile ? (
						<Accordion type="single" collapsible className="w-full">
							<AccordionItem value="owner">
								<AccordionTrigger className="text-left">
									<div className="flex items-center gap-2">
										<Crown className="h-4 w-4 text-yellow-600" />
										<span className="font-medium">Owner</span>
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<ul className="space-y-1 pl-6 text-muted-foreground text-sm">
										<li>• Full access to everything</li>
										<li>• Manage members and roles</li>
										<li>• Delete household data</li>
									</ul>
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="caregiver">
								<AccordionTrigger className="text-left">
									<div className="flex items-center gap-2">
										<Shield className="h-4 w-4 text-blue-600" />
										<span className="font-medium">Caregiver</span>
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<ul className="space-y-1 pl-6 text-muted-foreground text-sm">
										<li>• Record medications</li>
										<li>• Edit own records (10min window)</li>
										<li>• Manage inventory</li>
										<li>• Create non-high-risk regimens</li>
										<li>• Co-sign medications</li>
									</ul>
								</AccordionContent>
							</AccordionItem>

							<AccordionItem value="vet">
								<AccordionTrigger className="text-left">
									<div className="flex items-center gap-2">
										<Eye className="h-4 w-4 text-gray-600" />
										<span className="font-medium">Vet Read-Only</span>
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<ul className="space-y-1 pl-6 text-muted-foreground text-sm">
										<li>• View history and insights</li>
										<li>• Export data</li>
										<li>• No write permissions</li>
									</ul>
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					) : (
						<div className="grid gap-4 md:grid-cols-3">
							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Crown className="h-4 w-4 text-yellow-600" />
									<span className="font-medium">Owner</span>
								</div>
								<ul className="space-y-1 text-muted-foreground text-sm">
									<li>• Full access to everything</li>
									<li>• Manage members and roles</li>
									<li>• Delete household data</li>
								</ul>
							</div>

							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Shield className="h-4 w-4 text-blue-600" />
									<span className="font-medium">Caregiver</span>
								</div>
								<ul className="space-y-1 text-muted-foreground text-sm">
									<li>• Record medications</li>
									<li>• Edit own records (10min window)</li>
									<li>• Manage inventory</li>
									<li>• Create non-high-risk regimens</li>
									<li>• Co-sign medications</li>
								</ul>
							</div>

							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<Eye className="h-4 w-4 text-gray-600" />
									<span className="font-medium">Vet Read-Only</span>
								</div>
								<ul className="space-y-1 text-muted-foreground text-sm">
									<li>• View history and insights</li>
									<li>• Export data</li>
									<li>• No write permissions</li>
								</ul>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Current Members */}
			<Card>
				<CardHeader>
					<CardTitle>Members ({members.length})</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{members.map((member) => (
							<div
								key={member.id}
								className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
									<Avatar className="flex-shrink-0">
										{member.avatar && <AvatarImage src={member.avatar} />}
										<AvatarFallback
											className={cn(
												getAvatarColor(member.name || member.email),
												"font-medium text-sm text-white",
											)}
										>
											{(
												member.name?.[0] ||
												member.email?.[0] ||
												"?"
											).toUpperCase()}
										</AvatarFallback>
									</Avatar>

									<div className="min-w-0 flex-1">
										<div className="truncate font-medium">
											{member.name || member.email}
										</div>
										<div className="truncate text-muted-foreground text-sm">
											{member.email}
										</div>
										<div className="text-muted-foreground text-xs">
											<span className="block sm:inline">
												Joined {member.joinedAt.toLocaleDateString()}
											</span>
											{member.lastActiveAt && (
												<span className="block sm:inline">
													<span className="hidden sm:inline"> • </span>
													<span className="sm:hidden">Last active </span>
													<span className="hidden sm:inline">Last active </span>
													{member.lastActiveAt.toLocaleString()}
												</span>
											)}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-3 self-end sm:self-center">
									{canManageRoles && member.userId !== clerkUser?.id ? (
										<Select
											value={member.role}
											onValueChange={(value) =>
												handleRoleChange(member.id, value as typeof member.role)
											}
											disabled={updateRoleMutation.isPending}
										>
											<SelectTrigger className="w-[110px] sm:w-[140px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="OWNER">
													<div className="flex items-center gap-2">
														<Crown className="h-4 w-4" />
														<span className="hidden sm:inline">Owner</span>
														<span className="sm:hidden">Own</span>
													</div>
												</SelectItem>
												<SelectItem value="CAREGIVER">
													<div className="flex items-center gap-2">
														<Shield className="h-4 w-4" />
														<span className="hidden sm:inline">Caregiver</span>
														<span className="sm:hidden">Care</span>
													</div>
												</SelectItem>
												<SelectItem value="VETREADONLY">
													<div className="flex items-center gap-2">
														<Eye className="h-4 w-4" />
														<span className="hidden sm:inline">
															Vet Read-Only
														</span>
														<span className="sm:hidden">Vet</span>
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
									) : (
										<Badge
											className={cn(
												roleColors[member.role],
												"text-xs sm:text-sm",
											)}
										>
											{(() => {
												const Icon = roleIcons[member.role];
												return Icon ? <Icon className="mr-1 h-3 w-3" /> : null;
											})()}
											<span className="hidden sm:inline">
												{member.role === "OWNER"
													? "Owner"
													: member.role === "CAREGIVER"
														? "Caregiver"
														: "Vet Read-Only"}
											</span>
											<span className="sm:hidden">
												{member.role === "VETREADONLY"
													? "Vet"
													: member.role === "OWNER"
														? "Own"
														: "Care"}
											</span>
										</Badge>
									)}
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Pending Invites */}
			{pendingInvites.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Pending Invites ({pendingInvites.length})</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{pendingInvites.map((invite) => (
								<div
									key={invite.id}
									className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
								>
									<div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
										<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
											<Mail className="h-4 w-4 text-muted-foreground" />
										</div>

										<div className="min-w-0 flex-1">
											<div className="truncate font-medium">{invite.email}</div>
											<div className="text-muted-foreground text-sm">
												<span className="block sm:inline">
													Invited by {invite.invitedBy}
												</span>
												<span className="hidden sm:inline"> • </span>
												<span className="block sm:inline">
													{invite.invitedAt.toLocaleDateString()}
												</span>
											</div>
											<div className="text-muted-foreground text-xs">
												Expires {invite.expiresAt.toLocaleDateString()}
											</div>
										</div>
									</div>

									<div className="flex items-center gap-3 self-end sm:self-center">
										<Badge
											className={cn(
												roleColors[invite.role],
												"text-xs sm:text-sm",
											)}
										>
											{(() => {
												const Icon = roleIcons[invite.role];
												return Icon ? <Icon className="mr-1 h-3 w-3" /> : null;
											})()}
											<span className="hidden sm:inline">
												{invite.role === "OWNER"
													? "Owner"
													: invite.role === "CAREGIVER"
														? "Caregiver"
														: "Vet Read-Only"}
											</span>
											<span className="sm:hidden">
												{invite.role === "VETREADONLY"
													? "Vet"
													: invite.role === "OWNER"
														? "Own"
														: "Care"}
											</span>
										</Badge>

										{canManageRoles && (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="icon"
														disabled={
															resendInviteMutation.isPending ||
															revokeInviteMutation.isPending
														}
													>
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => handleResendInvite(invite.id)}
														disabled={resendInviteMutation.isPending}
													>
														<Mail className="mr-2 h-4 w-4" />
														Resend Invite
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleRevokeInvite(invite.id)}
														className="text-destructive"
														disabled={revokeInviteMutation.isPending}
													>
														<Trash2 className="mr-2 h-4 w-4" />
														Revoke Invite
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										)}
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Invite Form */}
			<InviteForm
				open={inviteFormOpen}
				onOpenChange={setInviteFormOpen}
				onInvite={handleInvite}
			/>
		</div>
	);
}
