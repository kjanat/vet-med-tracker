import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { AdministrationRecord } from "@/lib/utils/types";

interface HistoryCalendarProps {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  counts?: {
    total: number;
    onTime: number;
    late: number;
    missed: number;
    prn: number;
    date: Date;
  }[];
  month?: Date;
  onMonthChange?: (date: Date) => void;
  onSelectDay?: (day: Date) => void;
  records?: AdministrationRecord[];
}

export function HistoryCalendar({
  selectedDate: _selectedDate,
  onDateSelect: _onDateSelect,
  counts: _counts,
  month: _month,
  onMonthChange: _onMonthChange,
  onSelectDay: _onSelectDay,
  records: _records,
}: HistoryCalendarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Calendar component placeholder
        </p>
      </CardContent>
    </Card>
  );
}
