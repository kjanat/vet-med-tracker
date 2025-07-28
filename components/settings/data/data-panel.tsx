"use client"

import { useState } from "react"
import { Download, Trash2, Shield, FileText, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface AuditEntry {
  id: string
  userId: string
  userName: string
  action: string
  details: string
  timestamp: Date
  ipAddress?: string
}

// Mock audit data - replace with tRPC
const mockAuditEntries: AuditEntry[] = [
  {
    id: "1",
    userId: "user-1",
    userName: "John Smith",
    action: "admin.create",
    details: "Recorded Rimadyl for Buddy",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    ipAddress: "192.168.1.100",
  },
  {
    id: "2",
    userId: "user-2",
    userName: "Jane Doe",
    action: "inventory.set_in_use",
    details: "Set Insulin as in use for Whiskers",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    ipAddress: "192.168.1.101",
  },
  {
    id: "3",
    userId: "user-1",
    userName: "John Smith",
    action: "regimen.create",
    details: "Created PRN regimen for Buddy - Pain Relief",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    ipAddress: "192.168.1.100",
  },
]

// Mock current user - replace with auth context
const currentUser = { role: "Owner" }

export function DataPanel() {
  const [isExporting, setIsExporting] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [clearConfirm, setClearConfirm] = useState("")
  const [holdProgress, setHoldProgress] = useState(0)
  const [auditEntries] = useState(mockAuditEntries)

  const canViewAudit = currentUser.role === "Owner"
  const canClearData = currentUser.role === "Owner"

  const handleExport = async (format: "json" | "csv") => {
    setIsExporting(true)
    try {
      console.log(`Exporting data as ${format}`)

      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent("settings_data_export", {
          detail: { format },
        }),
      )

      // TODO: tRPC mutation
      // const data = await exportData.mutateAsync({
      //   householdId,
      //   format,
      //   from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      //   to: new Date()
      // })

      // Simulate download
      const filename = `vetmed-export-${new Date().toISOString().split("T")[0]}.${format}`
      console.log(`Downloaded ${filename}`)

      // Create mock download
      const mockData = format === "json" ? '{"export": "data"}' : "Date,Animal,Medication,Status\n"
      const blob = new Blob([mockData], { type: format === "json" ? "application/json" : "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearData = async () => {
    if (clearConfirm !== "DELETE" || !canClearData) return

    setIsClearing(true)
    try {
      console.log("Clearing household history")

      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent("settings_data_clear", {
          detail: { confirmed: true },
        }),
      )

      // TODO: tRPC mutation with re-auth
      // await clearHistory.mutateAsync({
      //   householdId,
      //   confirm: true
      // })

      setClearConfirm("")
      console.log("History cleared successfully")
    } catch (error) {
      console.error("Failed to clear history:", error)
    } finally {
      setIsClearing(false)
    }
  }

  const startHoldToClear = () => {
    if (clearConfirm !== "DELETE") return

    let progress = 0
    const interval = setInterval(() => {
      progress += 2
      setHoldProgress(progress)
      if (progress >= 100) {
        clearInterval(interval)
        setHoldProgress(0)
        handleClearData()
      }
    }, 30)

    const handleMouseUp = () => {
      clearInterval(interval)
      setHoldProgress(0)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Data & Privacy</h2>
        <p className="text-muted-foreground">Export your data and manage privacy settings</p>
      </div>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>Download your household&apos;s medication data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={() => handleExport("json")} disabled={isExporting} className="gap-2">
              <FileText className="h-4 w-4" />
              Export JSON
            </Button>
            <Button onClick={() => handleExport("csv")} disabled={isExporting} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Exports include all medication records, inventory, and animal profiles. Times are shown in each animal&apos;s
              local timezone.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Clear Data */}
      {canClearData && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Clear History
            </CardTitle>
            <CardDescription>Permanently delete all medication records and history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone. All medication records, history, and audit logs
                will be permanently deleted. Animal profiles and regimens will be preserved.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="confirm">Type &quot;DELETE&quot; to confirm</Label>
                <Input
                  id="confirm"
                  value={clearConfirm}
                  onChange={(e) => setClearConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="max-w-[200px]"
                />
              </div>

              <Button
                variant="destructive"
                disabled={clearConfirm !== "DELETE" || isClearing}
                onMouseDown={startHoldToClear}
                className="relative overflow-hidden"
              >
                <div
                  className="absolute inset-0 bg-destructive-foreground/20 transition-all duration-75"
                  style={{ width: `${holdProgress}%` }}
                />
                <span className="relative">
                  {isClearing ? "Clearing..." : holdProgress > 0 ? "Hold to Clear..." : "Hold to Clear History"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {canViewAudit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Audit Log
            </CardTitle>
            <CardDescription>Recent activity in your household</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.userName}</span>
                      <Badge variant="outline" className="text-xs">
                        {entry.action}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{entry.details}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.timestamp.toLocaleString()}
                      {entry.ipAddress && ` • ${entry.ipAddress}`}
                    </div>
                  </div>
                </div>
              ))}

              {auditEntries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No audit entries found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
