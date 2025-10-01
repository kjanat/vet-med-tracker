import { CheckCircle, Pill, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils/general";

interface FeatureHighlight {
  icon: typeof CheckCircle;
  label: string;
  color: string;
  bgColor: string;
}

const features: FeatureHighlight[] = [
  {
    bgColor: "bg-green-500/20",
    color: "text-green-600",
    icon: CheckCircle,
    label: "3-Tap Recording",
  },
  {
    bgColor: "bg-blue-500/20",
    color: "text-blue-600",
    icon: Smartphone,
    label: "Works Offline",
  },
  {
    bgColor: "bg-purple-500/20",
    color: "text-purple-600",
    icon: Pill,
    label: "Smart Reminders",
  },
];

interface FeatureHighlightsProps {
  className?: string;
}

export function FeatureHighlights({ className }: FeatureHighlightsProps) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-3xl flex-wrap justify-center gap-4 sm:gap-6",
        className,
      )}
    >
      {features.map((feature) => (
        <div
          className="flex items-center gap-3 transition-transform duration-300 hover:scale-105"
          key={`highlight-${feature.label.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110",
              feature.bgColor,
            )}
          >
            <feature.icon
              className={cn("h-5 w-5", feature.color, "animate-pulse")}
              style={{ animationDuration: "3s" }}
            />
          </div>
          <span className="font-medium text-sm">{feature.label}</span>
        </div>
      ))}
    </div>
  );
}
