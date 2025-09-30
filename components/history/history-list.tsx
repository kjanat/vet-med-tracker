import { Card, CardContent } from "@/components/ui/card";
import type { AdministrationRecord } from "@/lib/utils/types";

interface HistoryListProps {
  records?: AdministrationRecord[];
  onRecordSelect?: (record: AdministrationRecord) => void;
  groups?: { date: Date; records: AdministrationRecord[] }[];
  hasMore?: boolean;
  onCosign?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onLoadMore?: () => void;
  onUndo?: (id: string) => Promise<void>;
}

export function HistoryList({
  records = [],
  onRecordSelect: _onRecordSelect,
  groups: _groups,
  hasMore: _hasMore,
  onCosign: _onCosign,
  onDelete: _onDelete,
  onLoadMore: _onLoadMore,
  onUndo: _onUndo,
}: HistoryListProps) {
  return (
    <div className="space-y-2">
      {records.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">No records found</p>
          </CardContent>
        </Card>
      ) : (
        records.map((record) => (
          <Card className="cursor-pointer hover:bg-muted/50" key={record.id}>
            <CardContent className="p-4">
              <p className="text-sm">
                {record.medicationName} - {record.animalName}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
