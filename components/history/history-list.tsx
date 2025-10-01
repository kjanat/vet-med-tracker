import { ChevronDown } from "lucide-react";
import { Button } from "@/components/app/button";
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
  totalCount?: number;
}

export function HistoryList({
  records = [],
  onRecordSelect: _onRecordSelect,
  groups = [],
  hasMore = false,
  onCosign: _onCosign,
  onDelete: _onDelete,
  onLoadMore,
  onUndo: _onUndo,
  totalCount,
}: HistoryListProps) {
  // Use groups if provided, otherwise fall back to records
  const displayGroups =
    groups.length > 0 ? groups : [{ date: new Date(), records: records }];

  const isEmpty = groups.length === 0 && records.length === 0;

  return (
    <div className="space-y-4">
      {isEmpty ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-sm">No records found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {displayGroups.map((group) => (
            <div className="space-y-2" key={group.date.toISOString()}>
              <h3 className="font-semibold text-muted-foreground text-sm">
                {group.date.toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "long",
                  weekday: "long",
                  year: "numeric",
                })}
              </h3>
              <div className="space-y-2">
                {group.records.map((record) => (
                  <Card
                    className="cursor-pointer hover:bg-muted/50"
                    key={record.id}
                  >
                    <CardContent className="p-4">
                      <p className="text-sm">
                        {record.medicationName} - {record.animalName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {record.recordedAt.toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {hasMore && onLoadMore && (
            <div className="flex flex-col items-center gap-2 pt-4">
              {totalCount && (
                <p className="text-muted-foreground text-sm">
                  Showing{" "}
                  {displayGroups.reduce((sum, g) => sum + g.records.length, 0)}{" "}
                  of {totalCount} records
                </p>
              )}
              <Button onClick={onLoadMore} size="sm" variant="outline">
                <ChevronDown className="mr-2 h-4 w-4" />
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
