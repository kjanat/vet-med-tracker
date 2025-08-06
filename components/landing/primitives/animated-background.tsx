"use client";

import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
	className?: string;
	variant?: "default" | "subtle" | "intense";
}

const variants = {
	default: [
		{
			size: "h-80 w-80",
			position: "-top-40 -right-40",
			color: "bg-primary/20",
			delay: 0,
		},
		{
			size: "h-80 w-80",
			position: "top-[60vh] -left-40",
			color: "bg-primary/20",
			delay: 1000,
		},
		{
			size: "h-96 w-96",
			position: "top-1/3 left-1/3",
			color: "bg-primary/10",
			delay: 500,
		},
	],
	subtle: [
		{
			size: "h-64 w-64",
			position: "top-20 right-20",
			color: "bg-primary/10",
			delay: 0,
		},
		{
			size: "h-72 w-72",
			position: "bottom-20 left-20",
			color: "bg-primary/10",
			delay: 750,
		},
	],
	intense: [
		{
			size: "h-96 w-96",
			position: "-top-48 -right-48",
			color: "bg-primary/30",
			delay: 0,
		},
		{
			size: "h-96 w-96",
			position: "top-1/2 -left-48",
			color: "bg-primary/30",
			delay: 500,
		},
		{
			size: "h-[32rem] w-[32rem]",
			position: "top-1/4 left-1/4",
			color: "bg-primary/20",
			delay: 250,
		},
		{
			size: "h-80 w-80",
			position: "bottom-20 right-1/3",
			color: "bg-primary/15",
			delay: 750,
		},
	],
};

export function AnimatedBackground({
	className,
	variant = "default",
}: AnimatedBackgroundProps) {
	const orbs = variants[variant];

	return (
		<div
			className={cn(
				"pointer-events-none fixed inset-0 z-0 overflow-hidden",
				className,
			)}
			aria-hidden="true"
		>
			{orbs.map((orb, index) => (
				<div
					key={`orb-${variant}-${orb.position}-${orb.delay}`}
					className={cn(
						"absolute rounded-full blur-3xl transition-all duration-[2000ms]",
						orb.size,
						orb.position,
						orb.color,
						"animate-pulse",
					)}
					style={{
						animationDelay: `${orb.delay}ms`,
						animationDuration: `${4 + index}s`,
					}}
				/>
			))}
		</div>
	);
}
