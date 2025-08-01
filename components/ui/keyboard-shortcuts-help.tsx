"use client";

import { HelpCircle, Keyboard, X } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { TRANSITIONS } from "@/lib/animation-config";
import {
	KEYBOARD_SHORTCUTS,
	useFocusManagement,
	useKeyboardShortcuts,
} from "@/lib/keyboard-shortcuts";

/**
 * Keyboard Shortcuts Help Dialog
 *
 * Displays all available keyboard shortcuts in an accessible dialog.
 * Can be triggered via button click or keyboard shortcut (Ctrl+/ or ?).
 */
export function KeyboardShortcutsHelp() {
	const [isOpen, setIsOpen] = useState(false);
	const dialogRef = useRef<HTMLDivElement>(null);

	// Set up focus management for the dialog
	useFocusManagement(dialogRef as React.RefObject<HTMLElement>, {
		trapFocus: true,
		returnFocus: true,
		initialFocus: "[data-focus-initial]",
	});

	// Register keyboard shortcuts to open the help dialog
	useKeyboardShortcuts(
		{
			"Ctrl+/": () => setIsOpen(true),
			"?": () => setIsOpen(true),
			Escape: () => setIsOpen(false),
		},
		{
			enabled: isOpen, // Only handle Escape when dialog is open
		},
	);

	const shortcutGroups = {
		Navigation: ["Ctrl+R", "Ctrl+I", "Ctrl+H", "Ctrl+N", "Ctrl+S"],
		"Search & Utility": ["Ctrl+K", "Ctrl+/", "?"],
		"Quick Actions": ["Ctrl+Shift+A", "Ctrl+Shift+I", "Ctrl+Shift+R"],
		"Modal Controls": ["Escape", "Alt+M"],
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="gap-2"
					aria-label="Show keyboard shortcuts"
				>
					<Keyboard className="h-4 w-4" aria-hidden="true" />
					<span className="hidden sm:inline">Shortcuts</span>
				</Button>
			</DialogTrigger>

			<DialogContent
				ref={dialogRef}
				className="max-w-2xl max-h-[80vh] overflow-y-auto"
				aria-describedby="shortcuts-description"
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Keyboard className="h-5 w-5" aria-hidden="true" />
						Keyboard Shortcuts
					</DialogTitle>
					<DialogDescription id="shortcuts-description">
						Use these keyboard shortcuts to navigate VetMed Tracker more
						efficiently. Press Escape to close this dialog.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6">
					{Object.entries(shortcutGroups).map(([groupName, shortcuts]) => (
						<div key={groupName} className="space-y-3">
							<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
								{groupName}
							</h3>

							<ul
								className="grid gap-2 list-none"
								aria-label={`${groupName} shortcuts`}
							>
								{shortcuts.map((shortcut) => (
									<li
										key={shortcut}
										className={`flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 hover:bg-muted ${TRANSITIONS.interactive}`}
									>
										<span className="text-sm">
											{
												KEYBOARD_SHORTCUTS[
													shortcut as keyof typeof KEYBOARD_SHORTCUTS
												]
											}
										</span>
										<Badge variant="secondary" className="font-mono text-xs">
											{shortcut}
										</Badge>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className="flex justify-between items-center pt-4 border-t">
					<p className="text-xs text-muted-foreground">
						<HelpCircle className="h-3 w-3 inline mr-1" aria-hidden="true" />
						Tip: These shortcuts work from anywhere in the app
					</p>

					<Button
						variant="outline"
						size="sm"
						onClick={() => setIsOpen(false)}
						data-focus-initial
						aria-label="Close keyboard shortcuts help"
					>
						<X className="h-4 w-4 mr-1" aria-hidden="true" />
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/**
 * Floating Keyboard Shortcuts Help Button
 *
 * A floating action button that provides quick access to keyboard shortcuts.
 * Positioned in the bottom right corner for easy access.
 */
export function FloatingKeyboardHelp() {
	return (
		<div className="fixed bottom-4 right-4 z-50">
			<KeyboardShortcutsHelp />
		</div>
	);
}

/**
 * Quick shortcut display for specific contexts
 */
export function ContextualShortcuts({
	shortcuts,
	title = "Available shortcuts",
	className = "",
}: {
	shortcuts: Array<keyof typeof KEYBOARD_SHORTCUTS>;
	title?: string;
	className?: string;
}) {
	return (
		<section className={`space-y-2 ${className}`} aria-label={title}>
			<h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
				{title}
			</h4>

			<ul className="flex flex-wrap gap-2 list-none">
				{shortcuts.map((shortcut) => (
					<li key={shortcut} className="flex items-center gap-2 text-xs">
						<Badge variant="outline" className="font-mono">
							{shortcut}
						</Badge>
						<span className="text-muted-foreground">
							{KEYBOARD_SHORTCUTS[shortcut]}
						</span>
					</li>
				))}
			</ul>
		</section>
	);
}

/**
 * Hook to provide contextual keyboard shortcuts for specific pages
 */
export function useContextualShortcuts(
	context: "record" | "inventory" | "history" | "insights",
) {
	const contextShortcuts = {
		record: ["Ctrl+R", "Ctrl+Shift+A", "Escape"] as const,
		inventory: ["Ctrl+I", "Ctrl+Shift+I", "Ctrl+K"] as const,
		history: ["Ctrl+H", "Ctrl+K"] as const,
		insights: ["Ctrl+K"] as const,
	};

	return contextShortcuts[context] || [];
}
