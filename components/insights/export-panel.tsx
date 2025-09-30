import { Download, FileText, Table } from "lucide-react";
import { Button } from "@/components/app/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExportPanelProps {
  onExport?: (format: string) => void;
}

export function ExportPanel({ onExport }: ExportPanelProps) {
  const exportOptions = [
    {
      description: "Comprehensive report",
      format: "pdf",
      icon: <FileText className="h-4 w-4" />,
      label: "PDF Report",
    },
    {
      description: "Raw data export",
      format: "csv",
      icon: <Table className="h-4 w-4" />,
      label: "CSV Data",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {exportOptions.map((option) => (
          <Button
            className="w-full justify-start"
            key={option.format}
            onClick={() => onExport?.(option.format)}
            variant="outline"
          >
            {option.icon}
            <div className="ml-2 text-left">
              <div className="font-medium">{option.label}</div>
              <div className="text-muted-foreground text-xs">
                {option.description}
              </div>
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
