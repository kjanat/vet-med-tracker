"use client"

import { useState } from "react"
import { SummaryCards } from "@/components/insights/summary-cards"
import { ComplianceHeatmap } from "@/components/insights/compliance-heatmap"
import { ActionableSuggestions } from "@/components/insights/actionable-suggestions"
import { ExportPanel } from "@/components/insights/export-panel"

export default function InsightsPage() {
  const [selectedRange, setSelectedRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-muted-foreground">Compliance analytics and actionable recommendations</p>
      </div>

      {/* Above the fold - Summary Cards */}
      <SummaryCards range={selectedRange} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Heatmap */}
        <div className="lg:col-span-2 space-y-6">
          <ComplianceHeatmap range={selectedRange} onRangeChange={setSelectedRange} />
          <ExportPanel />
        </div>

        {/* Right rail - Actionable Suggestions */}
        <div className="space-y-6">
          <ActionableSuggestions range={selectedRange} />
        </div>
      </div>
    </div>
  )
}
