/**
 * Common className patterns extracted from repeated usage across components
 * These help maintain consistency and reduce duplication
 */

// Layout patterns
export const layoutPatterns = {
	flexCenter: "flex items-center justify-center",
	flexBetween: "flex items-center justify-between",
	flexStart: "flex items-start justify-between",
	flexEnd: "flex items-end justify-between",
	flexCenterGap2: "flex items-center gap-2",
	flexCenterGap4: "flex items-center gap-4",
} as const;

// Button base patterns
export const buttonPatterns = {
	baseButton:
		"inline-flex h-10 items-center justify-center rounded-md px-4 py-2 font-medium text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
	secondaryButton:
		"bg-secondary text-secondary-foreground hover:bg-secondary/90",
} as const;

// Text patterns
export const textPatterns = {
	monoSmall: "font-mono text-muted-foreground text-sm",
	monoXs: "font-mono text-xs",
	mutedSmall: "text-muted-foreground text-sm",
	mutedXs: "text-muted-foreground text-xs",
} as const;

// Card patterns
export const cardPatterns = {
	fullCard: "w-full max-w-lg",
	cardTitle: "flex items-center gap-2",
} as const;

// Common utility to combine patterns
export const cn = (
	...classes: (string | undefined | null | false)[]
): string => {
	return classes.filter(Boolean).join(" ");
};
