import { Card, CardContent } from "@/components/ui/card";

interface HistoryListProps {
  records?: any[];
  onRecordSelect?: (record: any) => void;
  groups?: { date: Date; records: any[] }[];
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
        records.map((record, index) => (
          <Card
            className="cursor-pointer hover:bg-muted/50"
            key={record.id || `record-${index}`}
          >
            <CardContent className="p-4">
              <p className="text-sm">Record {index + 1}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
