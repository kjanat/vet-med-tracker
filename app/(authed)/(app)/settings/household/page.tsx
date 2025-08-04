"use client";

import { Suspense } from "react";
import { type Member, MemberList } from "@/components/household/member-list";
import { useApp } from "@/components/providers/app-provider";
import { trpc } from "@/server/trpc/client";

function HouseholdContent() {
	const { selectedHousehold, user } = useApp();

	// Fetch household members
	const { data: membersData, isLoading: membersLoading } =
		trpc.household.getMembers.useQuery(
			{ householdId: selectedHousehold?.id ?? "" },
			{ enabled: !!selectedHousehold?.id },
		);

	// Transform the data to match the MemberList component's expected format
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

	// Find the current user's role in the household
	const currentUserMembership = membersData?.find(
		(member) => member.userId === user?.id,
	);
	const userRole = currentUserMembership?.role;

	if (!selectedHousehold) {
		return (
			<div className="space-y-6">
				<p className="text-muted-foreground">
					Please select a household to manage members
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{membersLoading ? (
				<div className="animate-pulse space-y-4">
					<div className="h-24 rounded-lg bg-muted" />
					<div className="h-24 rounded-lg bg-muted" />
					<div className="h-24 rounded-lg bg-muted" />
				</div>
			) : (
				<MemberList members={members} userRole={userRole} />
			)}
		</div>
	);
}

export default function HouseholdSettingsPage() {
	return (
		<Suspense
			fallback={<div className="min-h-screen animate-pulse bg-background" />}
		>
			<HouseholdContent />
		</Suspense>
	);
}
