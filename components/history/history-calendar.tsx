"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
// import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/general";
import type { AdministrationRecord } from "@/lib/utils/types";

interface DayCount {
  date: Date;
  total: number;
  onTime: number;
  late: number;
  missed: number;
  prn: number;
}

interface HistoryCalendarProps {
  month: Date;
  counts: DayCount[];
  records: AdministrationRecord[];
  onSelectDay: (day: Date) => void;
  onMonthChange: (month: Date) => void;
}

export function HistoryCalendar({
  month,
  counts,
  records,
  onSelectDay,
  onMonthChange,
}: HistoryCalendarProps) {
  // const [selectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayCount = (day: Date) => counts.find((c) => isSameDay(c.date, day));
  const getDayRecords = (day: Date) =>
    records.filter((r) => isSameDay(r.recordedAt, day));

  const getStatusColor = (count: DayCount) => {
    if (count.missed > 0) return "bg-red-500";
    if (count.late > 0) return "bg-yellow-500";
    if (count.onTime > 0) return "bg-green-500";
    if (count.prn > 0) return "bg-blue-500";
    return "bg-gray-300";
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-2xl">{format(month, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(subMonths(month, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>On-time</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span>Late</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>PRN</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-center font-medium text-muted-foreground text-sm"
          >
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((day) => {
          const dayCount = getDayCount(day);
          const dayRecords = getDayRecords(day);
          const isCurrentMonth = isSameMonth(day, month);

          return (
            <Sheet key={day.toISOString()}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative h-16 rounded-lg border p-2 transition-colors hover:bg-accent",
                    !isCurrentMonth && "opacity-50",
                    dayCount && "cursor-pointer",
                  )}
                  onClick={() => {
                    if (dayCount) {
                      onSelectDay(day);
                    }
                  }}
                  disabled={!dayCount}
                >
                  <div className="font-medium text-sm">{format(day, "d")}</div>
                  {dayCount && (
                    <div className="-translate-x-1/2 absolute bottom-1 left-1/2 transform">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          getStatusColor(dayCount),
                        )}
                      />
                    </div>
                  )}
                </button>
              </SheetTrigger>

              {dayCount && (
                <SheetContent
                  side="right"
                  className="w-full sm:w-[400px] md:w-[540px]"
                >
                  <SheetHeader>
                    <SheetTitle>{format(day, "EEEE, MMMM d, yyyy")}</SheetTitle>
                    <SheetDescription>
                      Medication administration history for this day
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-4">
                    {/* Day Summary */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center">
                        <div className="font-bold text-2xl text-green-600">
                          {dayCount.onTime}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          On-time
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-2xl text-yellow-600">
                          {dayCount.late}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Late
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-2xl text-red-600">
                          {dayCount.missed}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Missed
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-2xl text-blue-600">
                          {dayCount.prn}
                        </div>
                        <div className="text-muted-foreground text-xs">PRN</div>
                      </div>
                    </div>

                    {/* Day Records */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Administrations</h4>
                      {dayRecords.map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div>
                            <div className="font-medium">
                              {record.animalName} - {record.medicationName}
                            </div>
                            <div className="text-muted-foreground text-sm">
                              {format(record.recordedAt, "h:mm a")} •{" "}
                              {record.caregiverName}
                            </div>
                          </div>
                          <Badge
                            variant={
                              record.status === "ON_TIME"
                                ? "default"
                                : record.status === "MISSED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {record.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </SheetContent>
              )}
            </Sheet>
          );
        })}
      </div>
    </div>
  );
}
