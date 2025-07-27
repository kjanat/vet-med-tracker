import { DateTime } from "luxon"

export interface Suggestion {
  id: string
  type: "ADD_REMINDER" | "SHIFT_TIME" | "ENABLE_COSIGN"
  summary: string
  rationale: string
  action: {
    animalId?: string
    regimenId?: string
    dow?: number
    time?: string
    leadMinutes?: number
    days?: string[]
    toTime?: string
    highRisk?: boolean
  }
  priority: "high" | "medium" | "low"
  estimatedImpact: string
}

export function mockSuggestions(householdId: string): Suggestion[] {
  const suggestions: Suggestion[] = [
    {
      id: "sugg-add-reminder-1",
      type: "ADD_REMINDER",
      summary: "Add reminder for Milo's Prednisone on Fridays",
      rationale: "Late ≥ 25% on Friday 18:00 in last 30 days (4 of 12 doses)",
      action: {
        animalId: "milo",
        regimenId: "pred-regimen",
        dow: 5, // Friday
        time: "18:00",
        leadMinutes: 15,
      },
      priority: "high",
      estimatedImpact: "Could improve Friday compliance by 20-30%",
    },
    {
      id: "sugg-shift-time-1",
      type: "SHIFT_TIME",
      summary: "Shift Luna's ear drops on weekends to 09:00",
      rationale: "Median weekend lateness +22 min vs weekdays +3 min",
      action: {
        regimenId: "luna-ears-regimen",
        days: ["Saturday", "Sunday"],
        toTime: "09:00",
      },
      priority: "medium",
      estimatedImpact: "Could reduce weekend lateness by 15-20 minutes",
    },
    {
      id: "sugg-cosign-1",
      type: "ENABLE_COSIGN",
      summary: "Enable co-sign for Dexamethasone 0.5mg",
      rationale: "Two overlapping administrations detected last week (risk of double-dosing)",
      action: {
        regimenId: "dexmed-05-regimen",
        highRisk: true,
      },
      priority: "high",
      estimatedImpact: "Prevents accidental double-dosing of high-risk medication",
    },
    {
      id: "sugg-add-reminder-2",
      type: "ADD_REMINDER",
      summary: "Add morning reminder for Charlie's insulin",
      rationale: "Missed 3 of last 10 morning doses (30% miss rate)",
      action: {
        animalId: "charlie",
        regimenId: "insulin-regimen",
        dow: null, // All days
        time: "08:00",
        leadMinutes: 30,
      },
      priority: "high",
      estimatedImpact: "Critical for diabetic management - could prevent emergencies",
    },
    {
      id: "sugg-shift-time-2",
      type: "SHIFT_TIME",
      summary: "Move Buddy's evening Rimadyl to 19:30",
      rationale: "Consistently late by 45+ minutes (family dinner time conflict)",
      action: {
        regimenId: "rimadyl-regimen",
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        toTime: "19:30",
      },
      priority: "medium",
      estimatedImpact: "Better alignment with family schedule",
    },
  ]

  // Filter based on environment or feature flags
  const mockInsights = process.env.MOCK_INSIGHTS === "1"
  if (!mockInsights) {
    return []
  }

  // Rotate suggestions based on day to show variety in staging
  const dayOfYear = DateTime.now().ordinal
  const startIndex = dayOfYear % suggestions.length
  return suggestions.slice(startIndex).concat(suggestions.slice(0, startIndex)).slice(0, 3)
}

export function applySuggestion(suggestionId: string): { success: boolean; changes: string[] } {
  // Mock application of suggestions
  const changes: string[] = []

  if (suggestionId.includes("add-reminder")) {
    changes.push("Created new reminder 15 minutes before target time")
    changes.push("Updated notification preferences")
  } else if (suggestionId.includes("shift-time")) {
    changes.push("Updated regimen schedule times")
    changes.push("Recalculated upcoming due times")
  } else if (suggestionId.includes("cosign")) {
    changes.push("Enabled high-risk flag for regimen")
    changes.push("Co-sign now required for this medication")
  }

  return {
    success: true,
    changes,
  }
}
