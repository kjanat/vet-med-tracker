/**
 * Centralized animation and transition configuration
 * Ensures consistent timing, easing, and animation patterns across the app
 */

// Animation timing constants
export const ANIMATION_TIMING = {
	fast: "duration-150",
	normal: "duration-200",
	slow: "duration-300",
	slower: "duration-500",
} as const;

// Easing curves
export const EASING = {
	linear: "ease-linear",
	out: "ease-out",
	in: "ease-in",
	inOut: "ease-in-out",
} as const;

// Common transition combinations
export const TRANSITIONS = {
	// Button and interactive element transitions
	interactive: "transition-colors duration-200 ease-in-out",
	interactiveFast: "transition-colors duration-150 ease-out",

	// Transform transitions for scale/movement
	transform: "transition-transform duration-200 ease-out",
	transformFast: "transition-transform duration-150 ease-out",

	// Comprehensive transitions for complex state changes
	all: "transition-all duration-200 ease-in-out",
	allFast: "transition-all duration-150 ease-out",

	// Opacity transitions for fade effects
	opacity: "transition-opacity duration-300 ease-in-out",

	// Layout transitions (width, height, margin, padding)
	layout: "transition-[width,height,margin,padding] duration-200 ease-linear",
} as const;

// Card and surface animations
export const CARD_ANIMATIONS = {
	hover: "hover:shadow-md transition-all duration-200",
	active: "active:scale-[0.98] transition-transform duration-150 ease-out",
	selected: "ring-2 ring-primary ring-offset-2 shadow-md scale-[1.02]",
	touchManipulation: "touch-manipulation",
} as const;

// Loading and feedback animations
export const FEEDBACK_ANIMATIONS = {
	spin: "animate-spin",
	pulse: "animate-pulse",
	bounce: "animate-bounce",
} as const;

// Modal and overlay animations (using Tailwind's built-in animate utilities)
export const MODAL_ANIMATIONS = {
	// Backdrop fade
	backdropIn:
		"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",

	// Content zoom + slide
	contentIn:
		"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",

	// Popover/dropdown
	popoverIn:
		"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
} as const;

// Focus and accessibility animations
export const FOCUS_ANIMATIONS = {
	ring: "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
	outline: "focus-visible:outline-hidden",
	standard:
		"focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
} as const;

// Helper functions for common animation patterns
export const getCardAnimation = (isSelected = false, isInteractive = true) => {
	const base = "transition-all duration-200";
	const interactive = isInteractive
		? "hover:shadow-md active:scale-[0.98] touch-manipulation cursor-pointer"
		: "";
	const selected = isSelected
		? "ring-2 ring-primary ring-offset-2 shadow-md scale-[1.02]"
		: "";

	return `${base} ${interactive} ${selected}`.trim();
};

export const getButtonAnimation = (
	variant: "primary" | "secondary" | "ghost" = "primary",
) => {
	switch (variant) {
		case "primary":
			return "transition-colors duration-200 ease-in-out hover:bg-primary/90 active:scale-[0.98]";
		case "secondary":
			return "transition-colors duration-200 ease-in-out hover:bg-secondary/80 active:scale-[0.98]";
		case "ghost":
			return "transition-colors duration-200 ease-in-out hover:bg-accent hover:text-accent-foreground active:scale-[0.98]";
		default:
			return "transition-colors duration-200 ease-in-out";
	}
};

export const getLoadingAnimation = (
	type: "spin" | "pulse" | "bounce" = "spin",
) => {
	return FEEDBACK_ANIMATIONS[type];
};

// Priority indicator animation for urgent items
export const PRIORITY_ANIMATIONS = {
	urgent: "animate-pulse",
	high: "animate-none",
	normal: "animate-none",
} as const;

export type AnimationTiming = keyof typeof ANIMATION_TIMING;
export type EasingCurve = keyof typeof EASING;
export type TransitionType = keyof typeof TRANSITIONS;
export type CardAnimationType = keyof typeof CARD_ANIMATIONS;
export type FeedbackAnimationType = keyof typeof FEEDBACK_ANIMATIONS;
export type ModalAnimationType = keyof typeof MODAL_ANIMATIONS;
export type FocusAnimationType = keyof typeof FOCUS_ANIMATIONS;
export type PriorityAnimationType = keyof typeof PRIORITY_ANIMATIONS;
