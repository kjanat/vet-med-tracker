"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useScreenReaderAnnouncements } from "@/components/ui/screen-reader-announcer";
import { TRANSITIONS } from "@/lib/animation-config";
import { cn } from "@/lib/utils";

interface MedConfirmButtonProps {
	onConfirm: () => void;
	disabled?: boolean;
	requiresCoSign?: boolean;
	className?: string;
	children: React.ReactNode;
}

export function MedConfirmButton({
	onConfirm,
	disabled = false,
	requiresCoSign = false,
	className,
	children,
}: MedConfirmButtonProps) {
	const [isHolding, setIsHolding] = useState(false);
	const [progress, setProgress] = useState(0);
	const [isComplete, setIsComplete] = useState(false);
	const timeoutRef = useRef<number | undefined>(undefined);
	const intervalRef = useRef<number | undefined>(undefined);
	const startTimeRef = useRef<number | undefined>(undefined);
	const { announce } = useScreenReaderAnnouncements();

	const HOLD_DURATION = 3000; // 3 seconds

	const startHold = () => {
		if (disabled || isComplete) return;

		setIsHolding(true);
		setProgress(0);
		startTimeRef.current = Date.now();

		// Announce hold start
		announce(
			`Hold started. ${requiresCoSign ? "Co-sign required after confirmation." : "Continue holding for 3 seconds to confirm."}`,
			"polite",
		);

		// Progress animation
		intervalRef.current = window.setInterval(() => {
			const elapsed = Date.now() - (startTimeRef.current || 0);
			const newProgress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
			setProgress(newProgress);
		}, 16); // ~60fps

		// Complete after hold duration
		timeoutRef.current = window.setTimeout(() => {
			setIsComplete(true);
			setIsHolding(false);
			setProgress(100);

			// Announce confirmation success
			announce(
				`Medication confirmation completed${requiresCoSign ? ". Awaiting co-sign." : "."}`,
				"assertive",
			);

			onConfirm();

			// Reset after brief delay
			setTimeout(() => {
				setIsComplete(false);
				setProgress(0);
			}, 1000);
		}, HOLD_DURATION);
	};

	const cancelHold = () => {
		if (isHolding) {
			// Announce cancellation only if we were actually holding
			announce("Hold cancelled. Medication confirmation cancelled.", "polite");
		}

		setIsHolding(false);
		setProgress(0);

		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
	};

	useEffect(() => {
		return () => {
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	return (
		<div className="relative">
			<Button
				type="button"
				className={cn(
					"relative overflow-hidden",
					TRANSITIONS.all,
					isHolding && "scale-95",
					isComplete && "bg-green-600 hover:bg-green-600",
					requiresCoSign && "bg-orange-600 hover:bg-orange-700",
					className,
				)}
				disabled={disabled}
				onPointerDown={startHold}
				onPointerUp={cancelHold}
				onPointerLeave={cancelHold}
				onTouchStart={startHold}
				onTouchEnd={cancelHold}
				aria-label={`Hold for 3 seconds to confirm medication${requiresCoSign ? " (requires co-sign)" : ""}`}
				aria-pressed={isHolding}
				aria-describedby="hold-instruction"
				aria-live={isHolding ? "polite" : undefined}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={progress}
				aria-valuetext={
					isHolding ? `Hold progress: ${Math.round(progress)}%` : undefined
				}
			>
				{/* Progress bar background */}
				<div
					className="absolute inset-0 bg-white/20 transition-transform duration-75 ease-out origin-left"
					style={{
						transform: `scaleX(${progress / 100})`,
					}}
				/>

				{/* Button content */}
				<span className="relative z-10 flex items-center justify-center gap-2">
					{isComplete ? (
						<>
							<span className="text-lg">✓</span>
							Recorded!
						</>
					) : (
						children
					)}
				</span>
			</Button>

			{/* Progress indicator */}
			{isHolding && (
				<div
					className="absolute -bottom-1 left-0 right-0 h-1 bg-background rounded-full overflow-hidden"
					role="progressbar"
					aria-valuenow={progress}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label="Hold progress"
				>
					<div
						className="h-full bg-primary transition-transform duration-75 ease-out origin-left"
						style={{
							transform: `scaleX(${progress / 100})`,
						}}
					/>
				</div>
			)}

			{/* Screen reader instructions */}
			<div id="hold-instruction" className="sr-only">
				Hold and keep pressed for 3 seconds to confirm medication
				administration.
				{requiresCoSign &&
					" This medication requires co-signature within 10 minutes."}
			</div>
		</div>
	);
}
