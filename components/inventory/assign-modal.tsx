"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimalAvatar } from "@/components/ui/animal-avatar"
import { useApp } from "@/components/providers/app-provider"
import type { InventoryItem } from "./inventory-card"

interface AssignModalProps {
  item: InventoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (itemId: string, animalId: string | null) => Promise<void>
}

export function AssignModal({ item, open, onOpenChange, onAssign }: AssignModalProps) {
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { animals } = useApp()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return

    setIsSubmitting(true)
    try {
      await onAssign(item.id, selectedAnimalId === "unassigned" ? null : selectedAnimalId)
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to assign item:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Medication</DialogTitle>
          <DialogDescription>Assign {item.name} to an animal or leave unassigned for shared use</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Select
              value={selectedAnimalId || item.assignedAnimalId || "unassigned"}
              onValueChange={setSelectedAnimalId}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">?</div>
                    Unassigned (shared)
                  </div>
                </SelectItem>
                {animals.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id}>
                    <div className="flex items-center gap-2">
                      <AnimalAvatar animal={animal} size="sm" />
                      {animal.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Assigning..." : "Assign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
