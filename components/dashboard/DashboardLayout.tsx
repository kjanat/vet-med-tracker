"use client";

import { GripVertical, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/general";

export interface DashboardWidget {
	id: string;
	title: string;
	component: React.ComponentType<{ isFullscreen?: boolean }>;
	gridArea?: string;
	minWidth?: number;
	minHeight?: number;
	defaultExpanded?: boolean;
}

interface DashboardLayoutProps {
	widgets: DashboardWidget[];
	gap?: number;
	className?: string;
}

// CSS Grid breakpoint configurations
const GRID_CONFIGURATIONS = {
	mobile: {
		columns: 1,
		templateAreas: (widgets: DashboardWidget[]) =>
			widgets.map((_w, i) => `"widget-${i}"`).join(" "),
	},
	tablet: {
		columns: 2,
		templateAreas: (widgets: DashboardWidget[]) => {
			const rows = Math.ceil(widgets.length / 2);
			const areas = [];
			for (let row = 0; row < rows; row++) {
				const left = widgets[row * 2];
				const right = widgets[row * 2 + 1];
				areas.push(
					`"${left ? `widget-${row * 2}` : "."} ${right ? `widget-${row * 2 + 1}` : "."}"`,
				);
			}
			return areas.join(" ");
		},
	},
	desktop: {
		columns: 3,
		templateAreas: (widgets: DashboardWidget[]) => {
			// Custom layout for common dashboard patterns
			if (widgets.length === 4) {
				return `
          "widget-0 widget-1 widget-2"
          "widget-3 widget-3 widget-3"
        `;
			}
			if (widgets.length === 6) {
				return `
          "widget-0 widget-1 widget-2"
          "widget-3 widget-4 widget-5"
        `;
			}
			// Default: 3 columns
			const rows = Math.ceil(widgets.length / 3);
			const areas = [];
			for (let row = 0; row < rows; row++) {
				const cells = [];
				for (let col = 0; col < 3; col++) {
					const widgetIndex = row * 3 + col;
					cells.push(widgets[widgetIndex] ? `widget-${widgetIndex}` : ".");
				}
				areas.push(`"${cells.join(" ")}"`);
			}
			return areas.join(" ");
		},
	},
	wide: {
		columns: 4,
		templateAreas: (widgets: DashboardWidget[]) => {
			const rows = Math.ceil(widgets.length / 4);
			const areas = [];
			for (let row = 0; row < rows; row++) {
				const cells = [];
				for (let col = 0; col < 4; col++) {
					const widgetIndex = row * 4 + col;
					cells.push(widgets[widgetIndex] ? `widget-${widgetIndex}` : ".");
				}
				areas.push(`"${cells.join(" ")}"`);
			}
			return areas.join(" ");
		},
	},
};

interface WidgetWrapperProps {
	widget: DashboardWidget;
	index: number;
	isFullscreen: boolean;
	isCollapsed: boolean;
	onToggleFullscreen: () => void;
	onToggleCollapse: () => void;
	onRefresh: () => void;
	className?: string;
}

function WidgetWrapper({
	widget,
	index,
	isFullscreen,
	isCollapsed,
	onToggleFullscreen,
	onToggleCollapse,
	onRefresh,
	className,
}: WidgetWrapperProps) {
	const WidgetComponent = widget.component;

	return (
		<Card
			className={cn(
				"relative transition-all duration-300",
				isFullscreen && "pointer-events-auto fixed inset-4 z-50 shadow-2xl",
				isCollapsed && "overflow-hidden",
				className,
			)}
			style={{
				gridArea: isFullscreen ? "unset" : widget.gridArea || `widget-${index}`,
				minWidth: widget.minWidth || "auto",
				minHeight: isCollapsed ? "auto" : widget.minHeight || 300,
			}}
		>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-lg">{widget.title}</CardTitle>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={onRefresh}
						className="h-8 w-8 p-0"
						title="Refresh"
					>
						<RotateCcw className="h-4 w-4" />
						<span className="sr-only">Refresh {widget.title}</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggleCollapse}
						className="h-8 w-8 p-0"
						title={isCollapsed ? "Expand" : "Collapse"}
					>
						<GripVertical className="h-4 w-4" />
						<span className="sr-only">
							{isCollapsed ? "Expand" : "Collapse"} {widget.title}
						</span>
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={onToggleFullscreen}
						className="h-8 w-8 p-0"
						title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
					>
						{isFullscreen ? (
							<Minimize2 className="h-4 w-4" />
						) : (
							<Maximize2 className="h-4 w-4" />
						)}
						<span className="sr-only">
							{isFullscreen ? "Exit fullscreen" : "Fullscreen"} {widget.title}
						</span>
					</Button>
				</div>
			</CardHeader>
			{!isCollapsed && (
				<CardContent className="p-4">
					<WidgetComponent isFullscreen={isFullscreen} />
				</CardContent>
			)}
		</Card>
	);
}

export function DashboardLayout({
	widgets,
	gap = 4,
	className,
}: DashboardLayoutProps) {
	const [collapsedWidgets, setCollapsedWidgets] = useState<Set<string>>(
		new Set(),
	);
	const [fullscreenWidget, setFullscreenWidget] = useState<string | null>(null);
	const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});
	const [currentBreakpoint, setCurrentBreakpoint] =
		useState<keyof typeof GRID_CONFIGURATIONS>("desktop");
	const containerRef = useRef<HTMLDivElement>(null);

	// Responsive breakpoint detection
	useEffect(() => {
		const updateBreakpoint = () => {
			if (!window) return;

			const width = window.innerWidth;
			if (width < 640) {
				setCurrentBreakpoint("mobile");
			} else if (width < 1024) {
				setCurrentBreakpoint("tablet");
			} else if (width < 1440) {
				setCurrentBreakpoint("desktop");
			} else {
				setCurrentBreakpoint("wide");
			}
		};

		updateBreakpoint();
		window.addEventListener("resize", updateBreakpoint);
		return () => window.removeEventListener("resize", updateBreakpoint);
	}, []);

	// Initialize default collapsed states, preserving user choices
	useEffect(() => {
		setCollapsedWidgets((prev) => {
			const newCollapsed = new Set(prev);

			// Add defaults for new widgets that aren't expanded by default
			widgets.forEach((widget) => {
				if (!widget.defaultExpanded && !prev.has(widget.id)) {
					newCollapsed.add(widget.id);
				}
			});

			// Remove widgets that no longer exist
			const widgetIds = new Set(widgets.map((w) => w.id));
			for (const widgetId of prev) {
				if (!widgetIds.has(widgetId)) {
					newCollapsed.delete(widgetId);
				}
			}

			return newCollapsed;
		});
	}, [widgets]);

	const toggleWidgetCollapse = useCallback((widgetId: string) => {
		setCollapsedWidgets((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(widgetId)) {
				newSet.delete(widgetId);
			} else {
				newSet.add(widgetId);
			}
			return newSet;
		});
	}, []);

	const toggleWidgetFullscreen = useCallback((widgetId: string) => {
		setFullscreenWidget((prev) => (prev === widgetId ? null : widgetId));
	}, []);

	const refreshWidget = useCallback((widgetId: string) => {
		setRefreshKeys((prev) => {
			const nextKey = (prev[widgetId] ?? 0) + 1;
			const next = { ...prev, [widgetId]: nextKey };
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dashboard:widget-refresh", {
						detail: { widgetId, refreshKey: nextKey },
					}),
				);
			}
			return next;
		});
	}, []);

	const gridConfig = GRID_CONFIGURATIONS[currentBreakpoint];
	const templateAreas = gridConfig.templateAreas(widgets);

	// Handle escape key to exit fullscreen
	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape" && fullscreenWidget) {
				setFullscreenWidget(null);
			}
		};

		if (fullscreenWidget) {
			document.addEventListener("keydown", handleEscape);
			document.body.style.overflow = "hidden";
			return () => {
				document.removeEventListener("keydown", handleEscape);
				document.body.style.overflow = "unset";
			};
		}
	}, [fullscreenWidget]);

	return (
		<>
			<div
				ref={containerRef}
				className={cn(
					"grid w-full auto-rows-min",
					fullscreenWidget && "pointer-events-none",
					className,
				)}
				style={{
					gridTemplateColumns: `repeat(${gridConfig.columns}, minmax(0, 1fr))`,
					gridTemplateAreas: templateAreas,
					gap: `${gap * 0.25}rem`,
				}}
			>
				{widgets.map((widget, index) => (
					<WidgetWrapper
						key={`${widget.id}-${refreshKeys[widget.id] || 0}`}
						widget={widget}
						index={index}
						isFullscreen={fullscreenWidget === widget.id}
						isCollapsed={collapsedWidgets.has(widget.id)}
						onToggleFullscreen={() => toggleWidgetFullscreen(widget.id)}
						onToggleCollapse={() => toggleWidgetCollapse(widget.id)}
						onRefresh={() => refreshWidget(widget.id)}
					/>
				))}
			</div>

			{/* Fullscreen backdrop */}
			{fullscreenWidget && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
					onClick={() => setFullscreenWidget(null)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							setFullscreenWidget(null);
						}
					}}
					aria-label="Close fullscreen widget"
				/>
			)}
		</>
	);
}
