"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { VIEWPORT_CONFIG } from "./config";
import type { ViewportState } from "./constants";

interface MobileViewportPreviewProps {
	src: string;
	state: ViewportState;
}

export const MobileViewportPreview = memo(function MobileViewportPreview({
	src,
	state,
}: MobileViewportPreviewProps) {
	// Initialize scale to 0 - will be set in useEffect
	const [scale, setScale] = useState(0);
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [isPinching, setIsPinching] = useState(false);
	const [isMouseDragging, setIsMouseDragging] = useState(false);

	const containerRef = useRef<HTMLDivElement>(null);
	const frameRef = useRef<HTMLIFrameElement>(null);

	// Refs to store touch state without causing re-renders
	const touchStateRef = useRef({
		startX: 0,
		startY: 0,
		initialX: 0,
		initialY: 0,
		initialDistance: 0,
		initialScale: 1,
	});

	// Store fit scale in ref to access in handlers
	const fitScaleRef = useRef(1);

	// Calculate scale to fit viewport
	const calculateFitScale = useCallback(() => {
		if (!containerRef.current) return 1;

		const rect = containerRef.current.getBoundingClientRect();
		const containerWidth = rect.width;
		const containerHeight = rect.height;

		// Add padding for better visual appearance
		const padding = 32;
		const scaleX = (containerWidth - padding) / state.width;
		const scaleY = (containerHeight - padding) / state.height;
		return Math.min(scaleX, scaleY) * 0.95; // 95% to ensure it fits
	}, [state.width, state.height]);

	// Update scale when dimensions change (including rotation)
	useEffect(() => {
		const newFitScale = calculateFitScale();
		fitScaleRef.current = newFitScale;

		// If we're at fit scale or below, update to new fit scale
		// If we're zoomed in (scale > old fit scale), maintain zoom level
		setScale((prevScale) => {
			// On first load (scale is 0), set to fit scale
			if (prevScale === 0) {
				return newFitScale;
			}
			// If scale is close to previous fit scale, update to new fit scale
			if (prevScale <= fitScaleRef.current * 1.1) {
				return newFitScale;
			}
			// Otherwise maintain current scale
			return prevScale;
		});

		// Always reset position on dimension change to center the view
		setPosition({ x: 0, y: 0 });
	}, [calculateFitScale]);

	// Double tap detection for mobile
	const lastTapRef = useRef<number>(0);
	const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const handleDoubleTap = useCallback(() => {
		const currentFitScale = calculateFitScale();

		if (scale > currentFitScale * 1.1) {
			// If zoomed in, reset to fit
			setScale(currentFitScale);
			setPosition({ x: 0, y: 0 });
		} else {
			// If at fit scale or below, zoom to 100%
			setScale(1);
			setPosition({ x: 0, y: 0 });
		}
	}, [scale, calculateFitScale]);

	// Combined touch handler
	const handleTouchStart = useCallback(
		(e: TouchEvent) => {
			const touches = e.touches;

			if (touches.length === 2) {
				// Pinch zoom start
				e.preventDefault(); // Prevent default only for pinch
				setIsPinching(true);
				setIsDragging(false);

				const touch0 = touches[0];
				const touch1 = touches[1];
				if (touch0 && touch1) {
					const dx = touch0.clientX - touch1.clientX;
					const dy = touch0.clientY - touch1.clientY;
					touchStateRef.current.initialDistance = Math.sqrt(dx * dx + dy * dy);
					touchStateRef.current.initialScale = scale;
				}
			} else if (touches.length === 1 && !isPinching) {
				// Single touch - check for double tap
				const currentTime = Date.now();
				const tapGap = currentTime - lastTapRef.current;

				if (tapGap < 300 && tapGap > 0) {
					// Double tap detected
					e.preventDefault();
					handleDoubleTap();
					lastTapRef.current = 0;
					if (tapTimeoutRef.current) {
						clearTimeout(tapTimeoutRef.current);
						tapTimeoutRef.current = null;
					}
				} else {
					// Single tap - might be start of pan or just a tap
					lastTapRef.current = currentTime;

					// Clear any existing timeout
					if (tapTimeoutRef.current) {
						clearTimeout(tapTimeoutRef.current);
					}

					// Set timeout to clear tap state
					tapTimeoutRef.current = setTimeout(() => {
						lastTapRef.current = 0;
					}, 300);

					// Start tracking for potential pan
					if (scale > 1) {
						const touch = touches[0];
						if (touch) {
							touchStateRef.current.startX = touch.clientX;
							touchStateRef.current.startY = touch.clientY;
							touchStateRef.current.initialX = position.x;
							touchStateRef.current.initialY = position.y;
						}
					}
				}
			}
		},
		[scale, position, isPinching, handleDoubleTap],
	);

	const handleTouchMove = useCallback(
		(e: TouchEvent) => {
			const touches = e.touches;

			if (touches.length === 2 && isPinching) {
				// Pinch zoom
				e.preventDefault();

				const touch0 = touches[0];
				const touch1 = touches[1];
				if (!touch0 || !touch1) return;

				const dx = touch0.clientX - touch1.clientX;
				const dy = touch0.clientY - touch1.clientY;
				const distance = Math.sqrt(dx * dx + dy * dy);

				const scaleFactor = distance / touchStateRef.current.initialDistance;
				const currentFitScale = calculateFitScale();
				const minScale = Math.min(
					currentFitScale,
					VIEWPORT_CONFIG.mobile.pinchScaleMin,
				);
				const newScale = Math.max(
					minScale,
					Math.min(
						VIEWPORT_CONFIG.mobile.pinchScaleMax,
						touchStateRef.current.initialScale * scaleFactor,
					),
				);

				setScale(newScale);
			} else if (touches.length === 1 && isDragging && !isPinching) {
				// Pan
				const touch = touches[0];
				if (!touch) return;

				const deltaX = touch.clientX - touchStateRef.current.startX;
				const deltaY = touch.clientY - touchStateRef.current.startY;

				// Only pan if we've moved more than the touch threshold
				if (
					Math.abs(deltaX) > VIEWPORT_CONFIG.mobile.touchThreshold ||
					Math.abs(deltaY) > VIEWPORT_CONFIG.mobile.touchThreshold
				) {
					e.preventDefault();

					// Start dragging if not already
					if (!isDragging) {
						setIsDragging(true);
					}

					setPosition({
						x: touchStateRef.current.initialX + deltaX,
						y: touchStateRef.current.initialY + deltaY,
					});
				}
			}
		},
		[isDragging, isPinching, calculateFitScale],
	);

	const handleTouchEnd = useCallback(
		(e: TouchEvent) => {
			if (e.touches.length === 0) {
				setIsDragging(false);
				setIsPinching(false);
			} else if (e.touches.length === 1) {
				// Switching from pinch to pan
				setIsPinching(false);
				if (!isDragging) {
					setIsDragging(true);
					const touch = e.touches[0];
					if (touch) {
						touchStateRef.current.startX = touch.clientX;
						touchStateRef.current.startY = touch.clientY;
						touchStateRef.current.initialX = position.x;
						touchStateRef.current.initialY = position.y;
					}
				}
			}
		},
		[isDragging, position],
	);

	// Set up touch event listeners
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		// Add listeners to both container and overlay
		const addListeners = (element: HTMLElement) => {
			element.addEventListener("touchstart", handleTouchStart, {
				passive: false,
			});
			element.addEventListener("touchmove", handleTouchMove, {
				passive: false,
			});
			element.addEventListener("touchend", handleTouchEnd, { passive: true });
			element.addEventListener("touchcancel", handleTouchEnd, {
				passive: true,
			});
		};

		const removeListeners = (element: HTMLElement) => {
			element.removeEventListener("touchstart", handleTouchStart);
			element.removeEventListener("touchmove", handleTouchMove);
			element.removeEventListener("touchend", handleTouchEnd);
			element.removeEventListener("touchcancel", handleTouchEnd);
		};

		addListeners(container);

		return () => {
			removeListeners(container);
			if (tapTimeoutRef.current) {
				clearTimeout(tapTimeoutRef.current);
			}
		};
	}, [handleTouchStart, handleTouchMove, handleTouchEnd]);

	// Reset on double click (desktop)
	const handleDoubleClick = useCallback(() => {
		const currentFitScale = calculateFitScale();

		if (scale > currentFitScale * 1.1) {
			// If zoomed in, reset to fit
			setScale(currentFitScale);
			setPosition({ x: 0, y: 0 });
		} else {
			// If at fit scale or below, zoom to 100%
			setScale(1);
			setPosition({ x: 0, y: 0 });
		}
	}, [scale, calculateFitScale]);

	// Mouse support for desktop testing
	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			setIsMouseDragging(true);
			touchStateRef.current.startX = e.clientX;
			touchStateRef.current.startY = e.clientY;
			touchStateRef.current.initialX = position.x;
			touchStateRef.current.initialY = position.y;
		},
		[position],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!isMouseDragging) return;

			const deltaX = e.clientX - touchStateRef.current.startX;
			const deltaY = e.clientY - touchStateRef.current.startY;

			setPosition({
				x: touchStateRef.current.initialX + deltaX,
				y: touchStateRef.current.initialY + deltaY,
			});
		},
		[isMouseDragging],
	);

	const handleMouseUp = useCallback(() => {
		setIsMouseDragging(false);
	}, []);

	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault();
			const delta = e.deltaY > 0 ? 0.9 : 1.1;
			const currentFitScale = calculateFitScale();
			const minScale = Math.min(
				currentFitScale,
				VIEWPORT_CONFIG.mobile.pinchScaleMin,
			);
			const newScale = Math.max(
				minScale,
				Math.min(VIEWPORT_CONFIG.mobile.pinchScaleMax, scale * delta),
			);
			setScale(newScale);
		},
		[scale, calculateFitScale],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (tapTimeoutRef.current) {
				clearTimeout(tapTimeoutRef.current);
			}
		};
	}, []);

	// Send theme updates to iframe
	useEffect(() => {
		const iframe = frameRef.current;
		if (!iframe) return;

		const sendThemeUpdate = () => {
			// Try multiple times to ensure the message is received
			const attempts = [100, 300, 500, 1000];
			attempts.forEach((delay) => {
				setTimeout(() => {
					try {
						if (iframe.contentWindow) {
							iframe.contentWindow.postMessage(
								{
									type: "theme-change",
									theme: state.scheme,
								},
								"*", // In production, use specific origin
							);
						}
					} catch (error) {
						console.error("Failed to send theme message:", error);
					}
				}, delay);
			});
		};

		// Send initial theme on load
		const handleLoad = () => {
			sendThemeUpdate();
		};

		iframe.addEventListener("load", handleLoad);

		// Also send immediately in case iframe is already loaded
		if (
			iframe.contentDocument?.readyState === "complete" ||
			iframe.contentWindow
		) {
			sendThemeUpdate();
		}

		// Send theme update when scheme changes
		sendThemeUpdate();

		return () => {
			iframe.removeEventListener("load", handleLoad);
		};
	}, [state.scheme]);

	// Inject theme listener script into iframe
	useEffect(() => {
		const iframe = frameRef.current;
		if (!iframe) return;

		const injectThemeListener = () => {
			try {
				const doc = iframe.contentDocument || iframe.contentWindow?.document;
				if (!doc) return;

				// Create and inject script
				const script = doc.createElement("script");
				script.textContent = `
					(function() {
						// Listen for theme change messages
						window.addEventListener('message', function(event) {
							if (event.data && event.data.type === 'theme-change') {
								const theme = event.data.theme;
								
								// Update class-based theming (Tailwind v4 dark mode)
								const html = document.documentElement;
								
								if (theme === 'dark') {
									html.classList.add('dark');
									html.style.colorScheme = 'dark';
								} else if (theme === 'light') {
									html.classList.remove('dark');
									html.style.colorScheme = 'light';
								} else if (theme === 'system') {
									// Check system preference
									const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
									if (prefersDark) {
										html.classList.add('dark');
										html.style.colorScheme = 'dark';
									} else {
										html.classList.remove('dark');
										html.style.colorScheme = 'light';
									}
								}
								
								// Also set data-theme for any components that might use it
								html.setAttribute('data-theme', theme);
								
								// Dispatch custom event for any theme-aware components
								window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
							}
						});
						
						// Handle system theme changes when in system mode
						const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
						let currentMode = '${state.scheme}';
						
						mediaQuery.addEventListener('change', function(e) {
							if (currentMode === 'system') {
								const html = document.documentElement;
								if (e.matches) {
									html.classList.add('dark');
									html.style.colorScheme = 'dark';
								} else {
									html.classList.remove('dark');
									html.style.colorScheme = 'light';
								}
							}
						});
						
						// Update current mode on message
						window.addEventListener('message', function(event) {
							if (event.data && event.data.type === 'theme-change') {
								currentMode = event.data.theme;
							}
						});
						
						// Set initial theme
						const initialTheme = '${state.scheme}';
						const html = document.documentElement;
						
						if (initialTheme === 'dark') {
							html.classList.add('dark');
							html.style.colorScheme = 'dark';
						} else if (initialTheme === 'light') {
							html.classList.remove('dark');
							html.style.colorScheme = 'light';
						} else if (initialTheme === 'system') {
							const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
							if (prefersDark) {
								html.classList.add('dark');
								html.style.colorScheme = 'dark';
							} else {
								html.classList.remove('dark');
								html.style.colorScheme = 'light';
							}
						}
						
						html.setAttribute('data-theme', initialTheme);
					})();
				`;

				// Only inject if not already present
				if (!doc.querySelector("script[data-theme-listener]")) {
					script.setAttribute("data-theme-listener", "true");
					doc.body.appendChild(script);
				}
			} catch (error) {
				// Cross-origin iframe, can't inject script
				console.warn("Cannot inject theme listener:", error);
			}
		};

		iframe.addEventListener("load", injectThemeListener);

		// Try immediately in case already loaded
		if (iframe.contentDocument?.readyState === "complete") {
			injectThemeListener();
		}

		return () => {
			iframe.removeEventListener("load", injectThemeListener);
		};
	}, [state.scheme]);

	return (
		<section
			ref={containerRef}
			aria-label="Viewport preview container"
			className="absolute inset-0 overflow-hidden bg-muted/5"
			onDoubleClick={handleDoubleClick}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			onWheel={handleWheel}
			style={{
				touchAction: scale > 1 ? "none" : "manipulation", // Allow scrolling when not zoomed
				cursor: isMouseDragging ? "grabbing" : scale > 1 ? "grab" : "default",
			}}
		>
			<div
				className={cn(
					"absolute top-1/2 left-1/2",
					"transition-transform",
					(isDragging || isPinching) && "transition-none",
				)}
				style={{
					transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${scale})`,
					width: state.width,
					height: state.height,
					transitionDuration: `${VIEWPORT_CONFIG.transitions.pinchZoom}ms`,
				}}
			>
				{/* Device Frame */}
				<div className="relative h-full w-full">
					{/* Simple frame border */}
					<div className="pointer-events-none absolute inset-0 z-10 rounded-2xl border-4 border-foreground/10" />

					{/* Notch for modern phones */}
					{state.deviceType === "phone" &&
						state.orientation === "portrait" &&
						state.width < 400 && (
							<div className="-translate-x-1/2 pointer-events-none absolute top-0 left-1/2 z-10 h-6 w-32 rounded-b-2xl bg-foreground/10" />
						)}

					{/* Iframe */}
					<iframe
						ref={frameRef}
						src={src}
						title="Device viewport preview"
						className="h-full w-full rounded-xl"
						style={{
							pointerEvents: "auto",
						}}
					/>
				</div>
			</div>

			{/* Zoom Indicator */}
			{scale !== 1 && (
				<div className="absolute right-4 bottom-4 rounded-full bg-background/90 px-3 py-1.5 font-medium text-sm shadow-lg backdrop-blur">
					{Math.round(scale * 100)}%
				</div>
			)}

			{/* Touch Hints */}
			<div className="pointer-events-none absolute right-16 bottom-4 left-4">
				<div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
					<span className="rounded-full bg-background/80 px-3 py-1 backdrop-blur">
						{scale < 1
							? "Pinch to zoom • Double tap for 100%"
							: scale === 1
								? "Pinch to zoom • Scroll page normally"
								: "Drag to pan • Double tap to fit"}
					</span>
				</div>
			</div>
		</section>
	);
});
