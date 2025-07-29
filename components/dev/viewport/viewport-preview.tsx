"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
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
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [windowSize, setWindowSize] = useState({
		width: typeof window !== "undefined" ? window.innerWidth : 1200,
		height: typeof window !== "undefined" ? window.innerHeight : 800,
	});

	// Track window resize for responsive scaling
	useEffect(() => {
		const handleResize = () => {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		handleResize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Send theme updates to iframe
	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;

		const sendThemeUpdate = () => {
			// Wait a bit for iframe to load
			setTimeout(() => {
				try {
					iframe.contentWindow?.postMessage(
						{
							type: "theme-change",
							theme: state.scheme,
						},
						"*", // In production, use specific origin
					);
				} catch (error) {
					console.error("Failed to send theme message:", error);
				}
			}, 100);
		};

		// Send initial theme
		iframe.addEventListener("load", sendThemeUpdate);

		// Send theme update if scheme changes
		sendThemeUpdate();

		return () => {
			iframe.removeEventListener("load", sendThemeUpdate);
		};
	}, [state.scheme]);

	// Inject theme listener script into iframe
	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;

		const injectThemeListener = () => {
			try {
				const iframeDoc =
					iframe.contentDocument || iframe.contentWindow?.document;
				if (!iframeDoc) return;

				// Check if script already exists
				if (iframeDoc.getElementById("viewport-theme-listener")) return;

				const script = iframeDoc.createElement("script");
				script.id = "viewport-theme-listener";
				script.textContent = `
					(function() {
						function applyTheme(theme) {
							const html = document.documentElement;
							if (theme === 'dark') {
								html.classList.add('dark');
							} else if (theme === 'light') {
								html.classList.remove('dark');
							} else {
								// System theme - check user preference
								const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
								if (prefersDark) {
									html.classList.add('dark');
								} else {
									html.classList.remove('dark');
								}
							}
						}

						// Listen for theme messages
						window.addEventListener('message', function(event) {
							if (event.data && event.data.type === 'theme-change') {
								applyTheme(event.data.theme);
							}
						});

						// Apply initial theme based on parent
						const parentTheme = '${state.scheme}';
						applyTheme(parentTheme);
					})();
				`;
				iframeDoc.head.appendChild(script);
			} catch (error) {
				// Cross-origin iframe, can't inject script
				console.warn(
					"Cannot inject theme script - possible cross-origin iframe",
				);
			}
		};

		iframe.addEventListener("load", injectThemeListener);

		return () => {
			iframe.removeEventListener("load", injectThemeListener);
		};
	}, [state.scheme]);

	// Calculate scale to fit within viewport constraints
	// Account for padding, toolbar, and device info text
	const containerPadding = 32; // p-8 = 2rem = 32px on each side
	const toolbarAndDeviceListHeight = 300; // Rough estimate for toolbar + device selection
	const deviceInfoHeight = 100; // Space for device info text below

	const maxWidth = windowSize.width - containerPadding * 2;
	const maxHeight =
		windowSize.height - toolbarAndDeviceListHeight - deviceInfoHeight;

	// Always scale down if needed, never scale up
	const scaleX = state.width > maxWidth ? maxWidth / state.width : 1;
	const scaleY = state.height > maxHeight ? maxHeight / state.height : 1;
	const scale = Math.min(scaleX, scaleY, 1); // Never scale above 100%

	const scaledWidth = state.width * scale;
	const scaledHeight = state.height * scale;

	return (
		<div className={cn("flex flex-col items-center justify-center", className)}>
			<Card
				className="overflow-hidden shadow-2xl"
				style={{
					width: scaledWidth,
					height: scaledHeight,
				}}
			>
				<iframe
					ref={iframeRef}
					src={src}
					width={state.width}
					height={state.height}
					className="border-0 bg-background"
					style={{
						transform: `scale(${scale})`,
						transformOrigin: "top left",
						width: state.width,
						height: state.height,
					}}
					title="Device Preview"
				/>
			</Card>

			{/* Device Info */}
			<div className="mt-4 text-center text-sm text-muted-foreground">
				<p>
					{state.width} × {state.height} — {state.brand} {state.name}
					{scale < 1 && ` (${Math.round(scale * 100)}% scale)`}
				</p>
				<p className="text-xs mt-1">
					{state.orientation} • {state.deviceType} • Color scheme:{" "}
					{state.scheme}
				</p>
			</div>
		</div>
	);
};
