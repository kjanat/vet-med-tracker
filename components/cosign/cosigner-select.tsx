"use client";

import { Check, ChevronDown, Users } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { getAvatarColor } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils/general";
import { trpc } from "@/server/trpc/client";

interface CoSignerSelectProps {
	value?: string;
	onValueChange: (value: string) => void;
	disabled?: boolean;
	className?: string;
}

interface HouseholdMember {
	id: string;
	userId: string;
	householdId: string;
	role: "OWNER" | "CAREGIVER" | "VETREADONLY";
	createdAt: string;
	updatedAt: string;
	user: {
		id: string;
		name: string | null;
		email: string | null;
		image: string | null;
	} | null;
}

export function CoSignerSelect({
	value,
	onValueChange,
	disabled = false,
	className,
}: CoSignerSelectProps) {
	const [open, setOpen] = useState(false);
	const { selectedHousehold } = useApp();

	// Get household members who are eligible to co-sign (not VETREADONLY)
	const { data: householdMembers } = trpc.household.getMembers.useQuery(
		{ householdId: selectedHousehold?.id || "" },
		{ enabled: !!selectedHousehold?.id },
	);

	// Filter eligible co-signers (exclude VETREADONLY and current user)
	const eligibleMembers = (householdMembers || []).filter(
		(member: HouseholdMember) => member.role !== "VETREADONLY" && member.user,
	);

	const selectedMember = eligibleMembers.find(
		(member: HouseholdMember) => member.userId === value,
	);

	const handleSelect = (userId: string) => {
		onValueChange(userId);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					aria-expanded={open}
					aria-label="Select co-signer"
					className={cn(
						"h-12 w-full justify-between",
						!selectedMember && "text-muted-foreground",
						className,
					)}
					disabled={disabled || eligibleMembers.length === 0}
				>
					{selectedMember ? (
						<div className="flex items-center gap-3">
							<Avatar className="h-6 w-6">
								{selectedMember.user?.image && (
									<AvatarImage
										src={selectedMember.user.image}
										alt={
											selectedMember.user.name ||
											selectedMember.user.email ||
											"User"
										}
									/>
								)}
								<AvatarFallback
									className={cn(
										getAvatarColor(
											selectedMember.user?.name ||
												selectedMember.user?.email ||
												"U",
										),
										"font-medium text-white text-xs",
									)}
								>
									{(selectedMember.user?.name ||
										selectedMember.user?.email ||
										"U")[0]?.toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="flex flex-col items-start">
								<span className="font-medium">
									{selectedMember.user?.name || selectedMember.user?.email}
								</span>
								<span className="text-muted-foreground text-xs capitalize">
									{selectedMember.role.toLowerCase()}
								</span>
							</div>
						</div>
					) : (
						<div className="flex items-center gap-3">
							<Users className="h-4 w-4" />
							<span>
								{eligibleMembers.length === 0
									? "No eligible co-signers"
									: "Select co-signer"}
							</span>
						</div>
					)}
					<ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-[var(--radix-popover-trigger-width)] p-0"
				align="start"
			>
				<Command>
					<CommandList>
						{eligibleMembers.length === 0 ? (
							<CommandEmpty>
								<div className="flex flex-col items-center gap-2 p-4">
									<Users className="h-8 w-8 text-muted-foreground" />
									<div className="text-center">
										<p className="font-medium">No eligible co-signers</p>
										<p className="text-muted-foreground text-sm">
											Only household owners and caregivers can co-sign
											medications
										</p>
									</div>
								</div>
							</CommandEmpty>
						) : (
							<CommandGroup>
								{eligibleMembers.map((member: HouseholdMember) => {
									if (!member.user) return null;

									const isSelected = member.userId === value;
									const displayName =
										member.user.name || member.user.email || "Unknown User";

									return (
										<CommandItem
											key={member.userId}
											value={`${member.userId}-${displayName}`}
											onSelect={() => handleSelect(member.userId)}
											className="flex cursor-pointer items-center gap-3 p-3"
										>
											<Avatar className="h-8 w-8">
												{member.user.image && (
													<AvatarImage
														src={member.user.image}
														alt={displayName}
													/>
												)}
												<AvatarFallback
													className={cn(
														getAvatarColor(displayName),
														"font-medium text-sm text-white",
													)}
												>
													{displayName[0]?.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="flex flex-1 flex-col items-start">
												<span className="font-medium">{displayName}</span>
												<div className="flex items-center gap-2">
													<span className="text-muted-foreground text-xs capitalize">
														{member.role.toLowerCase()}
													</span>
													{member.user.email &&
														member.user.email !== displayName && (
															<span className="text-muted-foreground text-xs">
																{member.user.email}
															</span>
														)}
												</div>
											</div>
											<Check
												className={cn(
													"h-4 w-4",
													isSelected ? "opacity-100" : "opacity-0",
												)}
											/>
										</CommandItem>
									);
								})}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
