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
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if user is typing in input
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			switch (e.key.toLowerCase()) {
				case "r":
					if (e.metaKey || e.ctrlKey) {
						e.preventDefault();
						onReset();
					} else if (!e.shiftKey) {
						e.preventDefault();
						onRotate();
					}
					break;
				case "d":
					if (!e.metaKey && !e.ctrlKey && onOpenDeviceSelector) {
						e.preventDefault();
						onOpenDeviceSelector();
					}
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onRotate, onReset, onOpenDeviceSelector]);
}
