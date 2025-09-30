"use client";

import { useState } from "react";
import { Button } from "@/components/app/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HouseholdDialogsProps {
  children?: React.ReactNode;
  onCreateHousehold?: (data: { name: string; timezone?: string }) => void;
}

// Individual dialog exports for backward compatibility
interface EditHouseholdDialogProps {
  editedName: string;
  editedTimezone: string;
  isSaving: boolean;
  onNameChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onTimezoneChange: (value: string) => void;
  open: boolean;
}

export function EditHouseholdDialog(_props: EditHouseholdDialogProps) {
  // Simplified implementation - just return a placeholder for now
  return <HouseholdDialogs />;
}

interface LeaveHouseholdDialogProps {
  isLeaving: boolean;
  onLeave: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function LeaveHouseholdDialog({
  onOpenChange,
  open,
}: LeaveHouseholdDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Household</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave this household? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button onClick={() => onOpenChange(false)} variant="destructive">
            Leave Household
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HouseholdDialogs({
  children,
  onCreateHousehold,
}: HouseholdDialogsProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateHousehold?.({ name: name.trim(), timezone });
      setOpen(false);
      setName("");
      setTimezone("America/New_York");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {children || <Button>Create Household</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Household</DialogTitle>
          <DialogDescription>
            Create a new household to manage your animals and medications.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Household Name</Label>
            <Input
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Smith Family"
              required
              value={name}
            />
          </div>
          <div>
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/New_York"
              value={timezone}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button type="submit">Create Household</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export default HouseholdDialogs;
