import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ComplianceHeatmapProps {
  data?: Array<{
    date: string;
    compliance: number;
  }>;
  onRangeChange?: (range: { from: Date; to: Date }) => void;
  range?: {
    from: Date;
    to: Date;
  };
}

export function ComplianceHeatmap({ data = [] }: ComplianceHeatmapProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-muted-foreground text-sm">
          Heatmap visualization would go here
        </div>
        {data.length > 0 && (
          <div className="mt-4 space-y-2">
            {data.slice(0, 5).map((item) => (
              <div className="flex justify-between text-sm" key={item.date}>
                <span>{item.date}</span>
                <span>{item.compliance}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
