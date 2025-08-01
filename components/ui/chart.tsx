"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
	[k in string]: {
		label?: React.ReactNode;
		icon?: React.ComponentType;
	} & (
		| { color?: string; theme?: never }
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
	);
};

type ChartContextProps = {
	config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
	const context = React.useContext(ChartContext);

	if (!context) {
		throw new Error("useChart must be used within a <ChartContainer />");
	}

	return context;
}

const ChartContainer = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<"div"> & {
		config: ChartConfig;
		children: React.ComponentProps<
			typeof RechartsPrimitive.ResponsiveContainer
		>["children"];
	}
>(({ id, className, children, config, ...props }, ref) => {
	const uniqueId = React.useId();
	const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

	return (
		<ChartContext.Provider value={{ config }}>
			<div
				data-chart={chartId}
				ref={ref}
				className={cn(
					"flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
					className,
				)}
				{...props}
			>
				<ChartStyle id={chartId} config={config} />
				<RechartsPrimitive.ResponsiveContainer>
					{children}
				</RechartsPrimitive.ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	);
});
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
	const colorConfig = Object.entries(config).filter(
		([, config]) => config.theme || config.color,
	);

	if (!colorConfig.length) {
		return null;
	}

	return (
		<style
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Safe usage - injecting CSS styles only
			dangerouslySetInnerHTML={{
				__html: Object.entries(THEMES)
					.map(
						([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
	.map(([key, itemConfig]) => {
		const color =
			itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
			itemConfig.color;
		return color ? `  --color-${key}: ${color};` : null;
	})
	.join("\n")}
}
`,
					)
					.join("\n"),
			}}
		/>
	);
};

const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartPayloadItem {
	value?: number | string;
	name?: string;
	dataKey?: string;
	color?: string;
	payload?: Record<string, unknown> & { fill?: string };
}

interface ChartTooltipContentProps extends React.ComponentProps<"div"> {
	active?: boolean;
	payload?: ChartPayloadItem[];
	label?: string | number;
	labelFormatter?: (
		value: React.ReactNode,
		payload: ChartPayloadItem[],
	) => React.ReactNode;
	labelClassName?: string;
	formatter?: (
		value: number | string,
		name: string,
		item: ChartPayloadItem,
		index: number,
		payload: Record<string, unknown>,
	) => React.ReactNode;
	color?: string;
	hideLabel?: boolean;
	hideIndicator?: boolean;
	indicator?: "line" | "dot" | "dashed";
	nameKey?: string;
	labelKey?: string;
}

const ChartTooltipContent = React.forwardRef<
	HTMLDivElement,
	ChartTooltipContentProps
>(
	(
		{
			active,
			payload,
			className,
			indicator = "dot",
			hideLabel = false,
			hideIndicator = false,
			label,
			labelFormatter,
			labelClassName,
			formatter,
			color,
			nameKey,
			labelKey,
		},
		ref,
	) => {
		const { config } = useChart();

		const tooltipLabel = React.useMemo(() => {
			if (hideLabel || !payload?.length) {
				return null;
			}

			const [item] = payload;
			if (!item) return null;
			const key = `${labelKey || item.dataKey || item.name || "value"}`;
			const itemConfig = getPayloadConfigFromPayload(config, item, key);
			const value =
				!labelKey && typeof label === "string"
					? config[label as keyof typeof config]?.label || label
					: itemConfig?.label;

			if (labelFormatter) {
				return (
					<div className={cn("font-medium", labelClassName)}>
						{labelFormatter(value, payload)}
					</div>
				);
			}

			if (!value) {
				return null;
			}

			return <div className={cn("font-medium", labelClassName)}>{value}</div>;
		}, [
			label,
			labelFormatter,
			payload,
			hideLabel,
			labelClassName,
			config,
			labelKey,
		]);

		if (!active || !payload?.length) {
			return null;
		}

		const nestLabel = payload.length === 1 && indicator !== "dot";

		return (
			<div
				ref={ref}
				className={cn(
					"grid min-w-32 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
					className,
				)}
			>
				{!nestLabel ? tooltipLabel : null}
				<div className="grid gap-1.5">
					{payload.map((item, index) => (
						<TooltipItem
							key={item.dataKey}
							item={item}
							index={index}
							config={config}
							nameKey={nameKey}
							color={color}
							indicator={indicator}
							hideIndicator={hideIndicator}
							formatter={formatter}
							nestLabel={nestLabel}
							tooltipLabel={tooltipLabel}
						/>
					))}
				</div>
			</div>
		);
	},
);
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = RechartsPrimitive.Legend;

interface ChartLegendItem {
	value?: string;
	dataKey?: string;
	color?: string;
}

interface ChartLegendContentProps extends React.ComponentProps<"div"> {
	payload?: ChartLegendItem[];
	verticalAlign?: "top" | "bottom";
	hideIcon?: boolean;
	nameKey?: string;
}

const ChartLegendContent = React.forwardRef<
	HTMLDivElement,
	ChartLegendContentProps
>(
	(
		{ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
		ref,
	) => {
		const { config } = useChart();

		if (!payload?.length) {
			return null;
		}

		return (
			<div
				ref={ref}
				className={cn(
					"flex items-center justify-center gap-4",
					verticalAlign === "top" ? "pb-3" : "pt-3",
					className,
				)}
			>
				{payload.map((item) => {
					const key = `${nameKey || item.dataKey || "value"}`;
					const itemConfig = getPayloadConfigFromPayload(config, item, key);

					return (
						<div
							key={item.value}
							className={cn(
								"flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
							)}
						>
							{itemConfig?.icon && !hideIcon ? (
								<itemConfig.icon />
							) : (
								<div
									className="h-2 w-2 shrink-0 rounded-[2px]"
									style={{
										backgroundColor: item.color,
									}}
								/>
							)}
							{itemConfig?.label}
						</div>
					);
				})}
			</div>
		);
	},
);
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
	config: ChartConfig,
	payload: unknown,
	key: string,
) {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}

	const payloadPayload =
		"payload" in payload &&
		typeof payload.payload === "object" &&
		payload.payload !== null
			? payload.payload
			: undefined;

	let configLabelKey: string = key;

	if (
		key in payload &&
		typeof payload[key as keyof typeof payload] === "string"
	) {
		configLabelKey = payload[key as keyof typeof payload] as string;
	} else if (
		payloadPayload &&
		key in payloadPayload &&
		typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
	) {
		configLabelKey = payloadPayload[
			key as keyof typeof payloadPayload
		] as string;
	}

	return configLabelKey in config
		? config[configLabelKey]
		: config[key as keyof typeof config];
}

// Helper component for tooltip items
interface TooltipItemProps {
	item: ChartPayloadItem;
	index: number;
	config: ChartConfig;
	nameKey?: string;
	color?: string;
	indicator: "line" | "dot" | "dashed";
	hideIndicator: boolean;
	formatter?: (
		value: number | string,
		name: string,
		item: ChartPayloadItem,
		index: number,
		payload: Record<string, unknown>,
	) => React.ReactNode;
	nestLabel: boolean;
	tooltipLabel: React.ReactNode;
}

function TooltipItem({
	item,
	index,
	config,
	nameKey,
	color,
	indicator,
	hideIndicator,
	formatter,
	nestLabel,
	tooltipLabel,
}: TooltipItemProps) {
	const key = `${nameKey || item.name || item.dataKey || "value"}`;
	const itemConfig = getPayloadConfigFromPayload(config, item, key);
	const indicatorColor = color || item.payload?.fill || item.color;

	return (
		<div
			className={cn(
				"flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
				indicator === "dot" && "items-center",
			)}
		>
			{formatter && item?.value !== undefined && item.name && item.payload ? (
				formatter(item.value, item.name, item, index, item.payload)
			) : (
				<>
					<TooltipItemIcon
						itemConfig={itemConfig}
						hideIndicator={hideIndicator}
						indicator={indicator}
						indicatorColor={indicatorColor}
						nestLabel={nestLabel}
					/>
					<TooltipItemContent
						item={item}
						itemConfig={itemConfig}
						nestLabel={nestLabel}
						tooltipLabel={tooltipLabel}
					/>
				</>
			)}
		</div>
	);
}

function TooltipItemIcon({
	itemConfig,
	hideIndicator,
	indicator,
	indicatorColor,
	nestLabel,
}: {
	itemConfig?: ReturnType<typeof getPayloadConfigFromPayload>;
	hideIndicator: boolean;
	indicator: "line" | "dot" | "dashed";
	indicatorColor?: string;
	nestLabel: boolean;
}) {
	if (itemConfig?.icon) {
		return <itemConfig.icon />;
	}

	if (hideIndicator) {
		return null;
	}

	return (
		<div
			className={cn("shrink-0 rounded-[2px] border-border bg-(--color-bg)", {
				"h-2.5 w-2.5": indicator === "dot",
				"w-1": indicator === "line",
				"w-0 border-[1.5px] border-dashed bg-transparent":
					indicator === "dashed",
				"my-0.5": nestLabel && indicator === "dashed",
			})}
			style={
				{
					"--color-bg": indicatorColor,
					"--color-border": indicatorColor,
				} as React.CSSProperties
			}
		/>
	);
}

function TooltipItemContent({
	item,
	itemConfig,
	nestLabel,
	tooltipLabel,
}: {
	item: ChartPayloadItem;
	itemConfig?: ReturnType<typeof getPayloadConfigFromPayload>;
	nestLabel: boolean;
	tooltipLabel: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"flex flex-1 justify-between leading-none",
				nestLabel ? "items-end" : "items-center",
			)}
		>
			<div className="grid gap-1.5">
				{nestLabel ? tooltipLabel : null}
				<span className="text-muted-foreground">
					{itemConfig?.label || item.name}
				</span>
			</div>
			{item.value && (
				<span className="font-mono font-medium tabular-nums text-foreground">
					{item.value.toLocaleString()}
				</span>
			)}
		</div>
	);
}

export {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
};
