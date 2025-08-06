import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface EditHouseholdDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	editedName: string;
	onNameChange: (name: string) => void;
	editedTimezone: string;
	onTimezoneChange: (timezone: string) => void;
	onSave: () => void;
	isSaving: boolean;
}

export function EditHouseholdDialog({
	open,
	onOpenChange,
	editedName,
	onNameChange,
	editedTimezone,
	onTimezoneChange,
	onSave,
	isSaving,
}: EditHouseholdDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
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
							onChange={(e) => onNameChange(e.target.value)}
							placeholder="Enter household name"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="household-timezone">Timezone</Label>
						<Select value={editedTimezone} onValueChange={onTimezoneChange}>
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
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={onSave} disabled={isSaving}>
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface LeaveHouseholdDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onLeave: () => void;
	isLeaving: boolean;
}

export function LeaveHouseholdDialog({
	open,
	onOpenChange,
	onLeave,
	isLeaving,
}: LeaveHouseholdDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Leave Household</DialogTitle>
					<DialogDescription>
						Are you sure you want to leave this household? You'll need to be
						invited back to regain access.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onLeave} disabled={isLeaving}>
						Leave Household
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
