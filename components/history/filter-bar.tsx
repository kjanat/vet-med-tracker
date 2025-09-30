import { Button } from "@/components/ui/button";

interface FilterBarProps {
  onFilterChange?: (filters: any) => void;
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 border-b p-4">
      <Button size="sm" variant="outline">
        All Records
      </Button>
      <Button size="sm" variant="outline">
        Today
      </Button>
      <Button size="sm" variant="outline">
        This Week
      </Button>
    </div>
  );
}
