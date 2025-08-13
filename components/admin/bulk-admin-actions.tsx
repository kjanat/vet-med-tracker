"use client";

import { Plus, Users, X } from "lucide-react";
import { useState } from "react";
import { useBulkSelection } from "@/components/providers/bulk-selection-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BulkRecordingForm } from "./bulk-recording-form";

interface BulkAdminActionsProps {
  className?: string;
}

export function BulkAdminActions({ className }: BulkAdminActionsProps) {
  const { clearSelection, selectionCount } = useBulkSelection();
  const [showRecordingForm, setShowRecordingForm] = useState(false);

  if (selectionCount === 0) {
    return null;
  }

  return (
    <>
      <div className={`fixed right-4 bottom-20 left-4 z-40 ${className || ""}`}>
        <Card className="border-2 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">
                  <Badge variant="secondary" className="mr-2">
                    {selectionCount}
                  </Badge>
                  animal{selectionCount !== 1 ? "s" : ""} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowRecordingForm(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Record Administration
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearSelection}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BulkRecordingForm
        open={showRecordingForm}
        onOpenChange={setShowRecordingForm}
      />
    </>
  );
}
