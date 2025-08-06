import { cn } from "@/lib/utils";

interface Stat {
	value: string;
	label: string;
	highlight?: boolean;
}

interface StatsGridProps {
	stats: Stat[];
	className?: string;
}

export function StatsGrid({ stats, className }: StatsGridProps) {
	return (
		<div
			className={cn(
				"grid grid-cols-2 gap-8 text-center md:grid-cols-4",
				className,
			)}
		>
			{stats.map((stat) => (
				<div key={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
					<p
						className={cn(
							"mb-2 font-bold text-4xl",
							stat.highlight ? "text-primary" : "text-foreground",
						)}
					>
						{stat.value}
					</p>
					<p className="text-muted-foreground">{stat.label}</p>
				</div>
			))}
		</div>
	);
}
