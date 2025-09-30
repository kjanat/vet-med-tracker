"use client";

import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
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

export function useAnimalFormDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    closeDialog: () => setIsOpen(false),
    isOpen,
    openAnimalForm: () => setIsOpen(true), // Alias for backward compatibility
    openDialog: () => setIsOpen(true),
  };
}

interface AnimalFormDialogProps {
  children?: ReactNode;
  onSubmit?: (data: { name: string; species: string }) => void;
}

export function AnimalFormDialog({
  children,
  onSubmit,
}: AnimalFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && species) {
      onSubmit?.({ name, species });
      setOpen(false);
      setName("");
      setSpecies("");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        {children || <Button>Add Animal</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Animal</DialogTitle>
          <DialogDescription>
            Enter the basic information for your new animal.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter animal name"
              required
              value={name}
            />
          </div>
          <div>
            <Label htmlFor="species">Species</Label>
            <Input
              id="species"
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="e.g., Dog, Cat, Bird"
              required
              value={species}
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
            <Button type="submit">Add Animal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
