import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/general";

interface LoadingIndicatorProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingIndicator({
  className,
  size = "md",
}: LoadingIndicatorProps) {
  const sizeClasses = {
    lg: "h-8 w-8",
    md: "h-6 w-6",
    sm: "h-4 w-4",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
    </div>
  );
}
