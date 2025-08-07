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
import { useApp } from "@/components/providers/app-provider-consolidated";
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
import { useToast } from "@/hooks/shared/use-toast";
import { useIsMobile } from "@/hooks/shared/useResponsive";
import { getAvatarColor } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils/general";
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

export interface MemberListProps {
	members: Member[];
	pendingInvites?: PendingInvite[];
	userRole?: "OWNER" | "CAREGIVER" | "VETREADONLY";
}

const roleIcons = {
	OWNER: Crown,
	CAREGIVER: Shield,
	VETREADONLY: Eye,
};

const roleColors = {
	OWNER:
		"bg-purple-100 text-purple-900 dark:bg-purple-900/20 dark:text-purple-400",
	CAREGIVER: "bg-blue-100 text-blue-900 dark:bg-blue-900/20 dark:text-blue-400",
	VETREADONLY:
		"bg-gray-100 text-gray-900 dark:bg-gray-900/20 dark:text-gray-400",
};

// Extracted component for Member Avatar
function MemberAvatar({ member }: { member: Member }) {
	return (
		<Avatar className="flex-shrink-0">
			{member.avatar && <AvatarImage src={member.avatar} />}
			<AvatarFallback
				className={cn(
					getAvatarColor(member.name || member.email),
					"font-medium text-sm text-white",
				)}
			>
				{(member.name?.[0] || member.email?.[0] || "?").toUpperCase()}
			</AvatarFallback>
		</Avatar>
	);
}

// Extracted component for Member Info
function MemberInfo({ member }: { member: Member }) {
	return (
		<div className="min-w-0 flex-1">
			<div className="truncate font-medium">{member.name || member.email}</div>
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
	);
}

// Extracted component for Role Badge
function RoleBadge({ role }: { role: Member["role"] }) {
	const Icon = roleIcons[role];
	const roleLabels = {
		OWNER: { full: "Owner", short: "Own" },
		CAREGIVER: { full: "Caregiver", short: "Care" },
		VETREADONLY: { full: "Vet Read-Only", short: "Vet" },
	};

	return (
		<Badge className={cn(roleColors[role], "text-xs sm:text-sm")}>
			{Icon && <Icon className="mr-1 h-3 w-3" />}
			<span className="hidden sm:inline">{roleLabels[role].full}</span>
			<span className="sm:hidden">{roleLabels[role].short}</span>
		</Badge>
	);
}

// Extracted component for Role Selector
function RoleSelector({
	currentRole,
	onRoleChange,
	disabled,
}: {
	currentRole: Member["role"];
	onRoleChange: (role: Member["role"]) => void;
	disabled: boolean;
}) {
	return (
		<Select
			value={currentRole}
			onValueChange={(value) => onRoleChange(value as Member["role"])}
			disabled={disabled}
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
						<span className="hidden sm:inline">Vet Read-Only</span>
						<span className="sm:hidden">Vet</span>
					</div>
				</SelectItem>
			</SelectContent>
		</Select>
	);
}

// Extracted component for Member Item
function MemberItem({
	member,
	canManageRoles,
	currentUserId,
	onRoleChange,
	isUpdating,
}: {
	member: Member;
	canManageRoles: boolean;
	currentUserId?: string;
	onRoleChange: (memberId: string, role: Member["role"]) => void;
	isUpdating: boolean;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
				<MemberAvatar member={member} />
				<MemberInfo member={member} />
			</div>

			<div className="flex items-center gap-3 self-end sm:self-center">
				{canManageRoles && member.userId !== currentUserId ? (
					<RoleSelector
						currentRole={member.role}
						onRoleChange={(role) => onRoleChange(member.id, role)}
						disabled={isUpdating}
					/>
				) : (
					<RoleBadge role={member.role} />
				)}
			</div>
		</div>
	);
}

// Extracted component for Pending Invite Item
function PendingInviteItem({
	invite,
	onResend,
	onRevoke,
	isExpired,
}: {
	invite: PendingInvite;
	onResend: (inviteId: string) => void;
	onRevoke: (inviteId: string) => void;
	isExpired: boolean;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
						<span className="block sm:inline">
							<span className="hidden sm:inline"> • </span>
							<span className="sm:hidden">Expires </span>
							<span className="hidden sm:inline">Expires </span>
							{invite.expiresAt.toLocaleDateString()}
						</span>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-3 self-end sm:self-center">
				<RoleBadge role={invite.role} />

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size="icon" variant="ghost">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{!isExpired && (
							<DropdownMenuItem onClick={() => onResend(invite.id)}>
								Resend Invite
							</DropdownMenuItem>
						)}
						<DropdownMenuItem
							onClick={() => onRevoke(invite.id)}
							className="text-destructive"
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Revoke Invite
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

export function MemberList({
	members,
	pendingInvites = [],
	userRole = "CAREGIVER",
}: MemberListProps) {
	const { user: clerkUser } = useUser();
	const { selectedHousehold } = useApp();
	const { toast } = useToast();
	const isMobile = useIsMobile();
	const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);

	// Check if current user can manage roles
	const canManageRoles = userRole === "OWNER";

	// Mutations
	const updateRoleMutation = trpc.household.updateMemberRole.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Role updated",
				description: data.message,
			});
		},
		onError: (error) => {
			toast({
				title: "Failed to update role",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const _removeMemberMutation = trpc.household.removeMember.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Member removed",
				description: data.message,
			});
		},
		onError: (error) => {
			toast({
				title: "Failed to remove member",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const resendInviteMutation = trpc.household.resendInvite.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Invite resent",
				description: data.message,
			});
		},
		onError: (error) => {
			toast({
				title: "Failed to resend invite",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const revokeInviteMutation = trpc.household.revokeInvite.useMutation({
		onSuccess: (data) => {
			toast({
				title: "Invite revoked",
				description: data.message,
			});
		},
		onError: (error) => {
			toast({
				title: "Failed to revoke invite",
				description: error.message,
				variant: "destructive",
			});
		},
	});

	const handleRoleChange = (membershipId: string, newRole: Member["role"]) => {
		if (!selectedHousehold) return;
		updateRoleMutation.mutate({
			householdId: selectedHousehold.id,
			membershipId,
			newRole,
		});
	};

	const handleResendInvite = (inviteId: string) => {
		if (!selectedHousehold) return;
		resendInviteMutation.mutate({
			householdId: selectedHousehold.id,
			inviteId,
		});
	};

	const handleRevokeInvite = (inviteId: string) => {
		if (!selectedHousehold) return;
		revokeInviteMutation.mutate({
			householdId: selectedHousehold.id,
			inviteId,
		});
	};

	return (
		<div className="space-y-6">
			{/* Invite Member Accordion */}
			{canManageRoles && (
				<Accordion
					type="single"
					collapsible
					value={isInviteFormOpen ? "invite" : ""}
					onValueChange={(value) => setIsInviteFormOpen(value === "invite")}
				>
					<AccordionItem value="invite" className="rounded-lg border">
						<AccordionTrigger className="px-4 hover:no-underline">
							<div className="flex items-center gap-3">
								<Plus className="h-4 w-4" />
								<span>Invite New Member</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">
							<InviteForm
								open={isInviteFormOpen}
								onOpenChange={setIsInviteFormOpen}
								onInvite={async (_email, _role) => {
									// TODO: Implement invite functionality
									setIsInviteFormOpen(false);
								}}
							/>
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			)}

			{/* Current Members */}
			<Card>
				<CardHeader>
					<CardTitle>
						Current Members ({members.length})
						{!canManageRoles && isMobile && (
							<span className="ml-2 font-normal text-muted-foreground text-sm">
								(View only)
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{members.map((member) => (
							<MemberItem
								key={member.id}
								member={member}
								canManageRoles={canManageRoles}
								currentUserId={clerkUser?.id}
								onRoleChange={handleRoleChange}
								isUpdating={updateRoleMutation.isPending}
							/>
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
								<PendingInviteItem
									key={invite.id}
									invite={invite}
									onResend={handleResendInvite}
									onRevoke={handleRevokeInvite}
									isExpired={new Date() > invite.expiresAt}
								/>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
