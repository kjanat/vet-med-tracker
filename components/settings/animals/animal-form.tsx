"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Animal } from "./animal-list"

interface AnimalFormProps {
  animal: Animal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Animal>) => Promise<void>
}

const timezones = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Phoenix", label: "Arizona Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
]

export function AnimalForm({ animal, open, onOpenChange, onSave }: AnimalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newAllergy, setNewAllergy] = useState("")
  const [newCondition, setNewCondition] = useState("")
  const [formData, setFormData] = useState<Partial<Animal>>({
    name: "",
    species: "",
    breed: "",
    sex: undefined,
    neutered: false,
    dob: undefined,
    weightKg: undefined,
    microchipId: "",
    color: "",
    timezone: "America/New_York",
    vetName: "",
    vetPhone: "",
    allergies: [],
    conditions: [],
  })

  useEffect(() => {
    if (animal) {
      setFormData({
        ...animal,
        dob: animal.dob,
      })
    } else {
      setFormData({
        name: "",
        species: "",
        breed: "",
        sex: undefined,
        neutered: false,
        dob: undefined,
        weightKg: undefined,
        microchipId: "",
        color: "",
        timezone: "America/New_York",
        vetName: "",
        vetPhone: "",
        allergies: [],
        conditions: [],
      })
    }
  }, [animal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave(formData)
    } catch (error) {
      console.error("Failed to save animal:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addAllergy = () => {
    if (newAllergy.trim() && !formData.allergies?.includes(newAllergy.trim())) {
      setFormData((prev) => ({
        ...prev,
        allergies: [...(prev.allergies || []), newAllergy.trim()],
      }))
      setNewAllergy("")
    }
  }

  const removeAllergy = (allergy: string) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies?.filter((a) => a !== allergy) || [],
    }))
  }

  const addCondition = () => {
    if (newCondition.trim() && !formData.conditions?.includes(newCondition.trim())) {
      setFormData((prev) => ({
        ...prev,
        conditions: [...(prev.conditions || []), newCondition.trim()],
      }))
      setNewCondition("")
    }
  }

  const removeCondition = (condition: string) => {
    setFormData((prev) => ({
      ...prev,
      conditions: prev.conditions?.filter((c) => c !== condition) || [],
    }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{animal ? "Edit Animal" : "Add Animal"}</SheetTitle>
          <SheetDescription>
            {animal ? "Update animal profile and medical information" : "Create a new animal profile"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="species">Species *</Label>
                <Select
                  value={formData.species}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, species: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">Dog</SelectItem>
                    <SelectItem value="Cat">Cat</SelectItem>
                    <SelectItem value="Bird">Bird</SelectItem>
                    <SelectItem value="Rabbit">Rabbit</SelectItem>
                    <SelectItem value="Horse">Horse</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={formData.breed}
                  onChange={(e) => setFormData((prev) => ({ ...prev, breed: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <Select
                  value={formData.sex || ""}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, sex: value as "Male" | "Female" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob ? formData.dob.toISOString().split("T")[0] : ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dob: e.target.value ? new Date(e.target.value) : undefined,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.weightKg || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      weightKg: e.target.value ? Number.parseFloat(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="neutered"
                checked={formData.neutered}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, neutered: checked as boolean }))}
              />
              <Label htmlFor="neutered">Spayed/Neutered</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="microchip">Microchip ID</Label>
                <Input
                  id="microchip"
                  value={formData.microchipId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, microchipId: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone *</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Veterinary Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Veterinary Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vetName">Veterinarian Name</Label>
                <Input
                  id="vetName"
                  value={formData.vetName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vetName: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vetPhone">Veterinarian Phone</Label>
                <Input
                  id="vetPhone"
                  type="tel"
                  value={formData.vetPhone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, vetPhone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Medical Information</h3>

            <div className="space-y-3">
              <div>
                <Label>Allergies</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add allergy"
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAllergy())}
                  />
                  <Button type="button" onClick={addAllergy} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.allergies?.map((allergy) => (
                    <Badge key={allergy} variant="destructive" className="gap-1">
                      {allergy}
                      <button type="button" onClick={() => removeAllergy(allergy)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Medical Conditions</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add condition"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCondition())}
                  />
                  <Button type="button" onClick={addCondition} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.conditions?.map((condition) => (
                    <Badge key={condition} variant="secondary" className="gap-1">
                      {condition}
                      <button type="button" onClick={() => removeCondition(condition)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photo</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : animal ? "Update Animal" : "Create Animal"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
