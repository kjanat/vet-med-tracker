import { Button } from "@/components/app/button";

interface FilterBarProps {
  onFilterChange?: (filters: Record<string, unknown>) => void;
}

export function FilterBar({ onFilterChange: _onFilterChange }: FilterBarProps) {
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
