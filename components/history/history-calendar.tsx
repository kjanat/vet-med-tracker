import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  records?: any[];
}

export function HistoryCalendar({
  selectedDate,
  onDateSelect,
  counts,
  month,
  onMonthChange,
  onSelectDay,
  records,
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
