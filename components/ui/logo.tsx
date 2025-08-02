import { cn } from "@/lib/utils";

interface LogoProps {
	className?: string;
	size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
	const sizeClasses = {
		sm: "h-8 w-8",
		md: "h-10 w-10",
		lg: "h-12 w-12",
	};

	return (
		<div className={cn("flex items-center", className)}>
			{/* KJANAT Logo */}
			<svg
				viewBox="0 0 2000 2000"
				className={cn(sizeClasses[size], "text-foreground")}
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>KJANAT</title>
				<style>
					{`
						.kjanat-logo {
							color: currentColor;
						}
						.kjanat-logo circle {
							fill: transparent;
							stroke: currentColor;
						}
						.kjanat-logo path {
							fill: currentColor;
						}
					`}
				</style>
				<g className="kjanat-logo">
					<circle cx="1000" cy="1000" r="950.398" strokeWidth="99.205" />
					<path d="M438 1269.95v-275l378 419v275zm0-360v-150l378 418v150zm0-230v-470h378v280l269-280h477l-538 560 418 454v566.1z" />
				</g>
			</svg>
		</div>
	);
}
