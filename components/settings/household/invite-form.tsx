"use client";

import { Crown, Eye, Shield } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteFormProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onInvite?: (
    email: string,
    role: "Owner" | "Caregiver" | "VetReadOnly",
  ) => Promise<void>;
  onSuccess?: () => void;
}

export function InviteForm({
  open,
  onOpenChange,
  onInvite,
  onSuccess,
}: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<
    "Owner" | "Caregiver" | "VetReadOnly"
  >("Caregiver");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      if (onInvite) {
        await onInvite(email.trim(), selectedRole);
      }
      setEmail("");
      setSelectedRole("Caregiver");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to send invite:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    {
      color: "border-yellow-200 bg-yellow-50",
      description: "Full access including member management",
      icon: Crown,
      title: "Owner",
      value: "Owner" as const,
    },
    {
      color: "border-blue-200 bg-blue-50",
      description: "Can record medications and manage inventory",
      icon: Shield,
      title: "Caregiver",
      value: "Caregiver" as const,
    },
    {
      color: "border-gray-200 bg-gray-50",
      description: "View-only access to history and insights",
      icon: Eye,
      title: "Vet Read-Only",
      value: "VetReadOnly" as const,
    },
  ];

  const formContent = (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          required
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-3">
        <Label>Role</Label>
        <div className="grid gap-3">
          {roles.map((role) => (
            <Card
              className={`cursor-pointer transition-colors ${
                selectedRole === role.value
                  ? `ring-2 ring-primary ${role.color}`
                  : "hover:bg-accent"
              }`}
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <role.icon className="mt-0.5 h-5 w-5" />
                  <div className="flex-1">
                    <CardTitle className="text-base">{role.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {role.description}
                    </CardDescription>
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border-2 ${
                      selectedRole === role.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onOpenChange && (
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        )}
        <Button disabled={isSubmitting || !email.trim()} type="submit">
          {isSubmitting ? "Sending..." : "Send Invite"}
        </Button>
      </div>
    </form>
  );

  // If open and onOpenChange are provided, render as dialog
  if (open !== undefined && onOpenChange) {
    return (
      <Dialog onOpenChange={onOpenChange} open={open}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join this household
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise render inline
  return formContent;
}
