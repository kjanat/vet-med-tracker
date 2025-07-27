"use client"

import type React from "react"

import { useState } from "react"
import { Crown, Shield, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface InviteFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvite: (email: string, role: "Owner" | "Caregiver" | "VetReadOnly") => Promise<void>
}

export function InviteForm({ open, onOpenChange, onInvite }: InviteFormProps) {
  const [email, setEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState<"Owner" | "Caregiver" | "VetReadOnly">("Caregiver")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    try {
      await onInvite(email.trim(), selectedRole)
      setEmail("")
      setSelectedRole("Caregiver")
    } catch (error) {
      console.error("Failed to send invite:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const roles = [
    {
      value: "Owner" as const,
      icon: Crown,
      title: "Owner",
      description: "Full access including member management",
      color: "border-yellow-200 bg-yellow-50",
    },
    {
      value: "Caregiver" as const,
      icon: Shield,
      title: "Caregiver",
      description: "Can record medications and manage inventory",
      color: "border-blue-200 bg-blue-50",
    },
    {
      value: "VetReadOnly" as const,
      icon: Eye,
      title: "Vet Read-Only",
      description: "View-only access to history and insights",
      color: "border-gray-200 bg-gray-50",
    },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>Send an invitation to join this household</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-3">
            <Label>Role</Label>
            <div className="grid gap-3">
              {roles.map((role) => (
                <Card
                  key={role.value}
                  className={`cursor-pointer transition-colors ${
                    selectedRole === role.value ? `ring-2 ring-primary ${role.color}` : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <role.icon className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <CardTitle className="text-base">{role.title}</CardTitle>
                        <CardDescription className="mt-1">{role.description}</CardDescription>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          selectedRole === role.value ? "border-primary bg-primary" : "border-muted-foreground"
                        }`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
