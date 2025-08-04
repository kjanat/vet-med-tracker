import { useEffect } from "react";

interface UseViewportShortcutsProps {
	onRotate: () => void;
	onReset: () => void;
	onOpenDeviceSelector?: () => void;
}

export function useViewportShortcuts({
	onRotate,
	onReset,
	onOpenDeviceSelector,
}: UseViewportShortcutsProps) {
	useEffect(() => {
		// Helper function to check if user is typing
		const isUserTyping = (target: EventTarget | null): boolean => {
			return (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement
			);
		};

		// Handler for 'r' key (rotate/reset)
		const handleRKey = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey) {
				e.preventDefault();
				onReset();
			} else if (!e.shiftKey) {
				e.preventDefault();
				onRotate();
			}
		};

		// Handler for 'd' key (device selector)
		const handleDKey = (e: KeyboardEvent) => {
			if (!e.metaKey && !e.ctrlKey && onOpenDeviceSelector) {
				e.preventDefault();
				onOpenDeviceSelector();
			}
		};

		// Main keyboard handler - now simplified
		const handleKeyDown = (e: KeyboardEvent) => {
			if (isUserTyping(e.target)) {
				return;
			}

			const key = e.key.toLowerCase();
			if (key === "r") {
				handleRKey(e);
			} else if (key === "d") {
				handleDKey(e);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onRotate, onReset, onOpenDeviceSelector]);
}
