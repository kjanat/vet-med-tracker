"use client"

import { useState } from "react"
import { ChevronRight, Clock, CheckCircle, AlertTriangle, Trash2, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AnimalAvatar } from "@/components/ui/animal-avatar"
import { useApp } from "@/components/providers/app-provider"
import { useOfflineQueue } from "@/hooks/useOfflineQueue"
import { formatTimeLocal } from "@/utils/tz"
import { format, isToday, isYesterday } from "date-fns"

export interface AdministrationRecord {
  id: string
  animalId: string
  animalName: string
  medicationName: string
  strength: string
  route: string
  form: string
  slot?: string // "Morning", "Evening", "PRN"
  scheduledFor?: Date
  recordedAt: Date
  caregiverName: string
  status: "on-time" | "late" | "very-late" | "missed" | "prn"
  cosignPending: boolean
  cosignUser?: string
  cosignedAt?: Date
  sourceItem?: {
    name: string
    lot: string
    expiresOn: Date
  }
  site?: string
  notes?: string
  media?: string[]
  isEdited: boolean
  isDeleted: boolean
  editedBy?: string
  editedAt?: Date
}

interface HistoryListProps {
  groups: Array<{
    date: Date
    records: AdministrationRecord[]
  }>
  onLoadMore: () => void
  hasMore: boolean
  onUndo: (id: string) => void
  onDelete: (id: string) => void
  onCosign: (id: string) => void
}

export function HistoryList({ groups, onLoadMore, hasMore, onUndo, onDelete, onCosign }: HistoryListProps) {
  const { isOnline } = useOfflineQueue()

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No administrations found</h3>
          <p>No administrations in this range. Try widening your filters.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.date.toISOString()} className="space-y-3">
          <div className="sticky top-20 bg-background/95 backdrop-blur py-2">
            <h3 className="font-semibold text-lg">
              {isToday(group.date)
                ? "Today"
                : isYesterday(group.date)
                  ? "Yesterday"
                  : format(group.date, "EEEE, MMMM d")}
            </h3>
          </div>

          <div className="space-y-2">
            {group.records.map((record) => (
              <AdministrationRow
                key={record.id}
                record={record}
                onUndo={onUndo}
                onDelete={onDelete}
                onCosign={onCosign}
                isOffline={!isOnline}
              />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="text-center py-6">
          <Button
            variant="outline"
            onClick={() => {
              onLoadMore()
              window.dispatchEvent(new CustomEvent("history_pagination_next"))
            }}
          >
            Load More
          </Button>
        </div>
      )}

      {!isOnline && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Showing cached history. Some recent changes may not be visible.
        </div>
      )}
    </div>
  )
}

function AdministrationRow({
  record,
  onUndo,
  onDelete,
  onCosign,
  isOffline,
}: {
  record: AdministrationRecord
  onUndo: (id: string) => void
  onDelete: (id: string) => void
  onCosign: (id: string) => void
  isOffline: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { animals } = useApp()

  const animal = animals.find((a) => a.id === record.animalId)
  const canUndo = canUndoRecord(record)
  const canDelete = canDeleteRecord(record)

  const statusConfig = {
    "on-time": { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "On-time" },
    late: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100", label: "Late" },
    "very-late": { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100", label: "Very late" },
    missed: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100", label: "Missed" },
    prn: { icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-100", label: "PRN" },
  }

  const status = statusConfig[record.status]

  return (
    <Card className={record.isDeleted ? "opacity-50" : ""}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono text-muted-foreground min-w-[60px]">
                  {formatTimeLocal(record.recordedAt, "America/New_York")}
                </div>

                {animal && <AnimalAvatar animal={animal} size="sm" />}

                <div className="flex-1">
                  <div className="font-medium">
                    {record.animalName} - {record.medicationName} {record.strength}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {record.slot || "PRN"} • {record.caregiverName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className={`p-1 rounded-full ${status.bg}`}>
                          <status.icon className={`h-4 w-4 ${status.color}`} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{status.label}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {record.cosignPending && (
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      Awaiting Co-sign
                    </Badge>
                  )}

                  {record.isEdited && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="text-xs">
                            edited
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Edited by {record.editedBy} at {record.editedAt?.toLocaleString()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="border-t pt-4 space-y-4">
              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {record.scheduledFor && (
                  <div>
                    <span className="font-medium">Scheduled:</span>{" "}
                    {formatTimeLocal(record.scheduledFor, "America/New_York")}
                  </div>
                )}
                <div>
                  <span className="font-medium">Route:</span> {record.route} • {record.form}
                </div>
                {record.site && (
                  <div>
                    <span className="font-medium">Site:</span> {record.site}
                  </div>
                )}
                {record.sourceItem && (
                  <div>
                    <span className="font-medium">Source:</span> {record.sourceItem.name} (Lot {record.sourceItem.lot})
                  </div>
                )}
              </div>

              {/* Notes */}
              {record.notes && (
                <div>
                  <span className="font-medium text-sm">Notes:</span>
                  <p className="text-sm text-muted-foreground mt-1">{record.notes}</p>
                </div>
              )}

              {/* Co-sign Status */}
              {record.cosignUser && record.cosignedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span>
                    Co-signed by {record.cosignUser} at {formatTimeLocal(record.cosignedAt, "America/New_York")}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                {canUndo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onUndo(record.id)
                            window.dispatchEvent(new CustomEvent("history_undo", { detail: { recordId: record.id } }))
                          }}
                          disabled={isOffline}
                        >
                          Undo
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {record.status === "prn"
                          ? "Can undo PRN within 24 hours"
                          : "Can undo scheduled within 10 minutes"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {canDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onDelete(record.id)
                      window.dispatchEvent(new CustomEvent("history_delete", { detail: { recordId: record.id } }))
                    }}
                    disabled={isOffline}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                )}

                {record.cosignPending && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      onCosign(record.id)
                      window.dispatchEvent(new CustomEvent("history_cosign", { detail: { recordId: record.id } }))
                    }}
                    disabled={isOffline}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Co-sign
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function canUndoRecord(record: AdministrationRecord): boolean {
  const now = new Date()
  const recordTime = record.recordedAt
  const diffMinutes = (now.getTime() - recordTime.getTime()) / (1000 * 60)

  if (record.status === "prn") {
    return diffMinutes <= 24 * 60 // 24 hours for PRN
  } else {
    return diffMinutes <= 10 // 10 minutes for scheduled
  }
}

function canDeleteRecord(record: AdministrationRecord): boolean {
  return canUndoRecord(record) // Same logic for now
}
