import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/app/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActionableSuggestionsProps {
  suggestions?: Array<{
    id: string;
    type: "warning" | "success" | "info";
    title: string;
    description: string;
    action?: string;
  }>;
}

export function ActionableSuggestions({
  suggestions = [],
}: ActionableSuggestionsProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const defaultSuggestions = [
    {
      action: "Configure",
      description: "Enable notifications to never miss a dose",
      id: "1",
      title: "Set up medication reminders",
      type: "info" as const,
    },
  ];

  const items = suggestions.length > 0 ? suggestions : defaultSuggestions;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggestions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((suggestion) => (
          <div className="flex items-start gap-3" key={suggestion.id}>
            {getIcon(suggestion.type)}
            <div className="flex-1 space-y-1">
              <p className="font-medium text-sm">{suggestion.title}</p>
              <p className="text-muted-foreground text-xs">
                {suggestion.description}
              </p>
            </div>
            {suggestion.action && (
              <Button size="sm" variant="outline">
                {suggestion.action}
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
