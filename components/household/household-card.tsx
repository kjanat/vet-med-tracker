import { Building2, Edit2, LogOut, MoreVertical, Users } from "lucide-react";
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
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HouseholdCardProps {
	membership: {
		household: {
			id: string;
			name: string;
			createdAt: string;
			timezone?: string | null;
			_count?: {
				members?: number;
				animals?: number;
			};
		};
		role: string;
	};
	isSelected: boolean;
	onMakeActive: () => void;
	onEdit: () => void;
	onLeave: () => void;
}

export function HouseholdCard({
	membership,
	isSelected,
	onMakeActive,
	onEdit,
	onLeave,
}: HouseholdCardProps) {
	const isOwner = membership.role === "OWNER";

	return (
		<Card className={isSelected ? "border-primary" : ""}>
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
								{new Date(membership.household.createdAt).toLocaleDateString()}
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
							<span>{membership.household._count?.members || 0} members</span>
						</div>
						<div className="flex items-center gap-1">
							<span>{membership.household._count?.animals || 0} animals</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{!isSelected && (
							<Button variant="outline" size="sm" onClick={onMakeActive}>
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
										<DropdownMenuItem onClick={onEdit}>
											<Edit2 className="mr-2 h-4 w-4" />
											Edit Settings
										</DropdownMenuItem>
										<DropdownMenuSeparator />
									</>
								)}
								{!isOwner && (
									<DropdownMenuItem
										onClick={onLeave}
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
}
