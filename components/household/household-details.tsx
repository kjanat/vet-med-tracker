import { Building2, Edit2, LogOut, Settings } from "lucide-react";
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

interface HouseholdDetailsProps {
	household: {
		id: string;
		name: string;
		timezone?: string | null;
		createdAt: string;
		memberships?: unknown[];
		animals?: unknown[];
		regimens?: Array<{ isActive: boolean }>;
	};
	userRole?: string;
	onEdit: () => void;
	onLeave: () => void;
}

export function HouseholdDetails({
	household,
	userRole,
	onEdit,
	onLeave,
}: HouseholdDetailsProps) {
	return (
		<>
			{/* Household Details Card */}
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
						{userRole && (
							<Badge variant={userRole === "OWNER" ? "default" : "secondary"}>
								{userRole}
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-2">
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
					<Separator />
					<div className="flex flex-wrap gap-2">
						{userRole === "OWNER" && (
							<Button variant="outline" size="sm" onClick={onEdit}>
								<Edit2 className="mr-2 h-4 w-4" />
								Edit Settings
							</Button>
						)}
						{userRole !== "OWNER" && (
							<Button variant="outline" size="sm" onClick={onLeave}>
								<LogOut className="mr-2 h-4 w-4" />
								Leave Household
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Household Statistics */}
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
								{household.memberships?.length || 0}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Animals</p>
							<p className="font-medium text-2xl">
								{household.animals?.length || 0}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Active Regimens</p>
							<p className="font-medium text-2xl">
								{household.regimens?.filter((r) => r.isActive).length || 0}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	);
}
