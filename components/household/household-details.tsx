import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HouseholdDetailsProps {
  household?: {
    id: string;
    name: string;
    timezone?: string;
    createdAt?: Date;
    membership?: any;
    updatedAt?: Date;
  };
  onEdit?: () => void;
  onLeave?: () => void;
  userRole?: string;
}

export function HouseholdDetails({
  household,
  onEdit,
  onLeave,
  userRole,
}: HouseholdDetailsProps) {
  if (!household) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No household selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Household Details</CardTitle>
        <Button onClick={onEdit} size="sm" variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium">Name</h3>
          <p className="text-muted-foreground text-sm">{household.name}</p>
        </div>
        {household.timezone && (
          <div>
            <h3 className="font-medium">Timezone</h3>
            <p className="text-muted-foreground text-sm">
              {household.timezone}
            </p>
          </div>
        )}
        {household.createdAt && (
          <div>
            <h3 className="font-medium">Created</h3>
            <p className="text-muted-foreground text-sm">
              {household.createdAt.toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
