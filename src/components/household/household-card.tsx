import { Badge } from "@/components/app/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HouseholdCardProps {
  household?: {
    id: string;
    name: string;
    memberCount?: number;
    animalCount?: number;
  };
  onClick?: (household: {
    id: string;
    name: string;
    memberCount?: number;
    animalCount?: number;
  }) => void;
  isSelected?: boolean;
  membership?: Record<string, unknown>;
  onEdit?: () => void;
  onLeave?: () => void;
  onMakeActive?: () => void;
}

export function HouseholdCard({
  household,
  onClick,
  isSelected: _isSelected,
  membership: _membership,
  onEdit: _onEdit,
  onLeave: _onLeave,
  onMakeActive: _onMakeActive,
}: HouseholdCardProps) {
  if (!household) return null;

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={() => onClick?.(household)}
    >
      <CardHeader>
        <CardTitle className="text-lg">{household.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {household.memberCount && (
            <Badge variant="secondary">{household.memberCount} members</Badge>
          )}
          {household.animalCount && (
            <Badge variant="outline">{household.animalCount} animals</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
