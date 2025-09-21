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
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";

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
    <Dialog onOpenChange={onOpenChange} open={open}>
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
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter household name"
              value={editedName}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="household-timezone" id="household-timezone-label">
              Timezone
            </Label>
            <TimezoneCombobox
              ariaLabelledBy="household-timezone-label"
              id="household-timezone"
              onChange={onTimezoneChange}
              placeholder="Select timezone"
              value={editedTimezone}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={onSave}>
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Household</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave this household? You&apos;ll need to
            be invited back to regain access.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button disabled={isLeaving} onClick={onLeave} variant="destructive">
            Leave Household
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export combined dialogs for dynamic import
export const HouseholdDialogs = {
  EditHouseholdDialog,
  LeaveHouseholdDialog,
};

// Export default component wrapper for dynamic imports
export default function HouseholdDialogsWrapper(
  _props: Record<string, unknown>,
) {
  return null; // This is just for dynamic import compatibility
}
