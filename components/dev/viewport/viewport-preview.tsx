"use client";

import type React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ViewportState } from "./constants";

interface ViewportPreviewProps {
	src: string;
	state: ViewportState;
	className?: string;
}

export const ViewportPreview: React.FC<ViewportPreviewProps> = ({
	src,
	state,
	className,
}) => {
	return (
		<div className={cn("flex flex-col items-center justify-center", className)}>
			<Card
				className="overflow-hidden shadow-2xl"
				style={{
					width: state.width,
					height: state.height,
				}}
			>
				<iframe
					src={src}
					width={state.width}
					height={state.height}
					className="border-0 bg-background"
					title="Device Preview"
				/>
			</Card>

			{/* Device Info */}
			<div className="mt-4 text-center text-sm text-muted-foreground">
				<p>
					{state.width} × {state.height} — {state.brand} {state.name}
				</p>
				<p className="text-xs mt-1">
					{state.orientation} • {state.deviceType} • Color scheme:{" "}
					{state.scheme}
				</p>
			</div>
		</div>
	);
};
