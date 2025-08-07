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
		icon: CheckCircle,
		label: "3-Tap Recording",
		color: "text-green-600",
		bgColor: "bg-green-500/20",
	},
	{
		icon: Smartphone,
		label: "Works Offline",
		color: "text-blue-600",
		bgColor: "bg-blue-500/20",
	},
	{
		icon: Pill,
		label: "Smart Reminders",
		color: "text-purple-600",
		bgColor: "bg-purple-500/20",
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
					key={`highlight-${feature.label.toLowerCase().replace(/\s+/g, "-")}`}
					className="flex items-center gap-3 transition-transform duration-300 hover:scale-105"
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
