import { Plus } from "lucide-react";
import { Button } from "@/components/app/button";
import { cn } from "@/lib/utils/general";

interface RecordButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  prefilled?: boolean;
}

export function RecordButton({
  onClick,
  className,
  disabled = false,
  children = "Record",
  prefilled = false,
}: RecordButtonProps) {
  return (
    <Button
      className={cn(
        "gap-2",
        prefilled ? "bg-green-600 hover:bg-green-700" : "",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <Plus className="h-4 w-4" />
      {children}
    </Button>
  );
}
