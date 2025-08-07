import type { ReactNode } from "react";
import { cn } from "@/lib/utils/general";

interface SectionHeaderProps {
	title: string;
	description?: string;
	badge?: ReactNode;
	className?: string;
	align?: "left" | "center" | "right";
}

const alignmentStyles = {
	left: "text-left",
	center: "text-center",
	right: "text-right",
};

export function SectionHeader({
	title,
	description,
	badge,
	className,
	align = "center",
}: SectionHeaderProps) {
	return (
		<div className={cn("mb-16", alignmentStyles[align], className)}>
			{badge && <div className="mb-8">{badge}</div>}
			<h2 className="mb-4 font-bold text-3xl md:text-4xl">{title}</h2>
			{description && (
				<p className="mx-auto max-w-2xl text-muted-foreground text-xl">
					{description}
				</p>
			)}
		</div>
	);
}
