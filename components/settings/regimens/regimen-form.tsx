"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useApp } from "@/components/providers/app-provider"
import type { Regimen } from "./regimen-list"
import { format } from "date-fns"

interface RegimenFormProps {
  regimen: Regimen | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Regimen>) => Promise<void>
}

interface MedicationOption {
  id: string
  generic: string
  brand?: string
  route: string
  form: string
  strength?: string
}

// Mock medication catalog - replace with tRPC
const mockMedications: MedicationOption[] = [
  { id: "rimadyl-75mg", generic: "Carprofen", brand: "Rimadyl", route: "Oral", form: "Tablet", strength: "75mg" },
  {
    id: "insulin-40iu",
    generic: "Insulin",
    brand: "Vetsulin",
    route: "Subcutaneous",
    form: "Injection",
    strength: "40 IU/ml",
  },
  { id: "amoxicillin-250mg", generic: "Amoxicillin", route: "Oral", form: "Capsule", strength: "250mg" },
  { id: "pain-relief-5ml", generic: "Tramadol", route: "Oral", form: "Liquid", strength: "5ml" },
]

export function RegimenForm({ regimen, open, onOpenChange, onSave }: RegimenFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [medicationSearch, setMedicationSearch] = useState("")
  const [medicationOpen, setMedicationOpen] = useState(false)
  const [newTime, setNewTime] = useState("")
  const [formData, setFormData] = useState<Partial<Regimen>>({
    animalId: "",
    medicationId: "",
    medicationName: "",
    route: "",
    form: "",
    strength: "",
    scheduleType: "FIXED",
    timesLocal: [],
    startDate: undefined,
    endDate: undefined,
    cutoffMins: 60,
    highRisk: false,
  })

  const { animals } = useApp()

  useEffect(() => {
    if (regimen) {
      setFormData({
        ...regimen,
        startDate: regimen.startDate,
        endDate: regimen.endDate,
      })
    } else {
      setFormData({
        animalId: "",
        medicationId: "",
        medicationName: "",
        route: "",
        form: "",
        strength: "",
        scheduleType: "FIXED",
        timesLocal: [],
        startDate: undefined,
        endDate: undefined,
        cutoffMins: 60,
        highRisk: false,
      })
    }
  }, [regimen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSave(formData)
    } catch (error) {
      console.error("Failed to save regimen:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMedicationSelect = (medication: MedicationOption) => {
    setFormData((prev) => ({
      ...prev,
      medicationId: medication.id,
      medicationName: medication.brand || medication.generic,
      route: medication.route,
      form: medication.form,
      strength: medication.strength,
    }))
    setMedicationOpen(false)
  }

  const addTime = () => {
    if (newTime && !formData.timesLocal?.includes(newTime)) {
      setFormData((prev) => ({
        ...prev,
        timesLocal: [...(prev.timesLocal || []), newTime].sort(),
      }))
      setNewTime("")
    }
  }

  const removeTime = (time: string) => {
    setFormData((prev) => ({
      ...prev,
      timesLocal: prev.timesLocal?.filter((t) => t !== time) || [],
    }))
  }

  const filteredMedications = mockMedications.filter(
    (med) =>
      med.generic.toLowerCase().includes(medicationSearch.toLowerCase()) ||
      med.brand?.toLowerCase().includes(medicationSearch.toLowerCase()),
  )

  // Generate preview of today's slots
  const todaySlots =
    formData.scheduleType === "FIXED" && formData.timesLocal?.length ? (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Today's Schedule Preview</CardTitle>
          <CardDescription>Times shown in animal's timezone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {formData.timesLocal.map((time) => (
              <Badge key={time} variant="outline">
                {format(new Date(`2000-01-01T${time}`), "h:mm a")}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    ) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{regimen ? "Edit Regimen" : "Add Regimen"}</SheetTitle>
          <SheetDescription>
            {regimen ? "Update medication schedule and dosing" : "Create a new medication regimen"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Animal Selection */}
          <div className="space-y-2">
            <Label htmlFor="animal">Animal *</Label>
            <Select
              value={formData.animalId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, animalId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select animal" />
              </SelectTrigger>
              <SelectContent>
                {animals.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id}>
                    {animal.name} ({animal.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Medication Selection */}
          <div className="space-y-2">
            <Label>Medication *</Label>
            <Popover open={medicationOpen} onOpenChange={setMedicationOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-transparent">
                  {formData.medicationName || "Select medication"}
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput
                    placeholder="Search medications..."
                    value={medicationSearch}
                    onValueChange={setMedicationSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-2">No medication found</p>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Create custom medication
                            const customName = medicationSearch.trim()
                            if (customName) {
                              setFormData((prev) => ({
                                ...prev,
                                medicationId: `custom-${Date.now()}`,
                                medicationName: customName,
                                route: "",
                                form: "",
                                strength: "",
                              }))
                              setMedicationOpen(false)
                            }
                          }}
                        >
                          Create "{medicationSearch}"
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {filteredMedications.map((medication) => (
                        <CommandItem key={medication.id} onSelect={() => handleMedicationSelect(medication)}>
                          <div>
                            <div className="font-medium">
                              {medication.brand || medication.generic}
                              {medication.brand && medication.brand !== medication.generic && (
                                <span className="text-muted-foreground font-normal"> ({medication.generic})</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {medication.strength} • {medication.route} • {medication.form}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {formData.medicationName && (
              <div className="text-sm text-muted-foreground">
                {formData.strength} • {formData.route} • {formData.form}
              </div>
            )}
          </div>

          {/* Schedule Type */}
          <div className="space-y-3">
            <Label>Schedule Type *</Label>
            <div className="grid grid-cols-2 gap-4">
              <Card
                className={`cursor-pointer transition-colors ${
                  formData.scheduleType === "FIXED" ? "ring-2 ring-primary" : "hover:bg-accent"
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, scheduleType: "FIXED" }))}
              >
                <CardContent className="p-4">
                  <div className="font-medium">Fixed Schedule</div>
                  <div className="text-sm text-muted-foreground">Regular times each day</div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${
                  formData.scheduleType === "PRN" ? "ring-2 ring-primary" : "hover:bg-accent"
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, scheduleType: "PRN" }))}
              >
                <CardContent className="p-4">
                  <div className="font-medium">PRN (As Needed)</div>
                  <div className="text-sm text-muted-foreground">Given when required</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Fixed Schedule Times */}
          {formData.scheduleType === "FIXED" && (
            <div className="space-y-3">
              <Label>Daily Times *</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="Add time"
                />
                <Button type="button" onClick={addTime} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.timesLocal?.map((time) => (
                  <Badge key={time} variant="secondary" className="gap-1">
                    {format(new Date(`2000-01-01T${time}`), "h:mm a")}
                    <button type="button" onClick={() => removeTime(time)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {formData.timesLocal?.length === 0 && (
                <p className="text-sm text-muted-foreground">Add at least one daily time</p>
              )}
            </div>
          )}

          {/* Course Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate ? formData.startDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value ? new Date(e.target.value) : undefined,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate ? formData.endDate.toISOString().split("T")[0] : ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endDate: e.target.value ? new Date(e.target.value) : undefined,
                  }))
                }
              />
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cutoff">Cutoff Minutes</Label>
              <Select
                value={formData.cutoffMins?.toString()}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, cutoffMins: Number.parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                  <SelectItem value="720">12 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Time after scheduled dose when it's marked as "missed"</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="highRisk"
                checked={formData.highRisk}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, highRisk: checked as boolean }))}
              />
              <Label htmlFor="highRisk" className="text-sm">
                High-risk medication (requires co-signature)
              </Label>
            </div>
          </div>

          {/* Preview */}
          {todaySlots}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.animalId ||
                !formData.medicationName ||
                (formData.scheduleType === "FIXED" && (!formData.timesLocal || formData.timesLocal.length === 0))
              }
            >
              {isSubmitting ? "Saving..." : regimen ? "Update Regimen" : "Create Regimen"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
